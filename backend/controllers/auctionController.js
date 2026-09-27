// Auction scheduling and the server-authoritative bid placement endpoint.
// IMPORTANT: bid validity is enforced here on the backend, never trusted from the client.
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Lot = require('../models/Lot');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

// POST /api/auctions  (mandi staff schedules an auction for an approved lot)
const createAuction = asyncHandler(async (req, res) => {
  const { lot, startTime, endTime, minimumIncrement } = req.body;
  if (!lot || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'lot, startTime and endTime are required' });
  }

  const lotDoc = await Lot.findById(lot);
  if (!lotDoc) return res.status(404).json({ success: false, message: 'Lot not found' });
  if (lotDoc.status !== 'approved') {
    return res.status(400).json({ success: false, message: 'Lot must be approved before scheduling an auction' });
  }

  const auction = await Auction.create({
    lot,
    startTime,
    endTime,
    basePrice: lotDoc.basePrice,
    reservePrice: lotDoc.reservePrice,
    minimumIncrement: minimumIncrement || 25,
    currentHighestBid: lotDoc.basePrice,
  });

  lotDoc.status = 'auction_scheduled';
  await lotDoc.save();

  res.status(201).json({ success: true, data: auction });
});

// GET /api/auctions?status=
const getAuctions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const now = new Date();

  await Auction.updateMany(
    {
      status: 'scheduled',
      startTime: { $lte: now },
      endTime: { $gte: now },
    },
    { $set: { status: 'active' } }
  );

  const auctions = await Auction.find(filter)
    .populate({
      path: 'lot',
      populate: [
        { path: 'commodity' },
        { path: 'farmer', select: 'name' }
      ]
    })
    .populate('highestBidder', 'name')
    .sort({ startTime: 1 });

  res.json({ success: true, data: auctions });
});

// GET /api/auctions/:id
const getAuctionById = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id)
    .populate({ path: 'lot', populate: [{ path: 'commodity' }, { path: 'farmer', select: 'name' }] })
    .populate('highestBidder', 'name');
  if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });

  const bids = await Bid.find({ auction: auction._id }).populate('buyer', 'name').sort({ timestamp: -1 }).limit(50);

  res.json({ success: true, data: { auction, bids } });
});

// POST /api/auctions/:id/bids
// This is the authoritative place a bid is accepted. The Socket.IO handler
// (sockets/auctionSocket.js) calls this same logic path for real-time bids too.
const placeBid = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await processBid({
    auctionId: req.params.id,
    buyerId: req.user._id,
    amount,
    io: req.app.get('io'),
  });
  if (!result.success) return res.status(400).json(result);
  res.status(201).json(result);
});

// Shared bid-processing logic used by both the REST endpoint and the socket handler.
// Returns { success, message, data } and never trusts anything except auctionId/buyerId/amount.
async function processBid({ auctionId, buyerId, amount, io }) {
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return { success: false, message: 'Invalid bid amount' };
  }

  const auction = await Auction.findById(auctionId).populate('lot');
  if (!auction) return { success: false, message: 'Auction not found' };

  const now = new Date();
  if (auction.status !== 'active') {
    // Auto-activate if within the scheduled window and still 'scheduled'
    if (auction.status === 'scheduled' && now >= auction.startTime && now <= auction.endTime) {
      auction.status = 'active';
    } else {
      return { success: false, message: 'Auction is not currently active' };
    }
  }
  if (now > auction.endTime) {
    return { success: false, message: 'Auction has ended' };
  }

  const minRequired = auction.currentHighestBid + auction.minimumIncrement;
  if (amount < minRequired) {
    return { success: false, message: `Bid must be at least ₹${minRequired}` };
  }

  const bid = await Bid.create({ auction: auction._id, buyer: buyerId, amount });

  auction.currentHighestBid = amount;
  auction.highestBidder = buyerId;
  auction.bidCount += 1;
  await auction.save();

  const populatedBid = await bid.populate('buyer', 'name');

  // Broadcast to everyone watching this auction room in real time
  if (io) {
    io.to(`auction:${auction._id}`).emit('newBid', {
      auctionId: auction._id,
      amount,
      buyer: { id: populatedBid.buyer._id, name: populatedBid.buyer.name },
      currentHighestBid: auction.currentHighestBid,
      nextMinimumBid: auction.currentHighestBid + auction.minimumIncrement,
      bidCount: auction.bidCount,
      timestamp: bid.timestamp,
    });
  }

  return { success: true, message: 'Bid placed successfully', data: { auction, bid: populatedBid } };
}

// POST /api/auctions/:id/close  (mandi staff / cron closes an auction manually or automatically)
const closeAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id).populate('lot');
  if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
  if (auction.status !== 'active' && auction.status !== 'scheduled') {
    return res.status(400).json({ success: false, message: 'Auction already closed' });
  }

  const lot = auction.lot;
  if (auction.highestBidder && auction.currentHighestBid >= auction.reservePrice) {
    auction.status = 'closed_sold';
    lot.status = 'sold';
  } else {
    auction.status = 'closed_unsold';
    lot.status = 'unsold';
  }
  await auction.save();
  await lot.save();

  const io = req.app.get('io');
  if (io) io.to(`auction:${auction._id}`).emit('auctionClosed', { auctionId: auction._id, status: auction.status });

  if (auction.status === 'closed_sold') {
    await notify(io, {
      userId: auction.highestBidder,
      title: 'Auction won!',
      message: `You won the auction for lot ${lot.lotId} at ₹${auction.currentHighestBid}.`,
      type: 'auction',
    });
    await notify(io, {
      userId: lot.farmer,
      title: 'Your lot has been sold',
      message: `Lot ${lot.lotId} sold for ₹${auction.currentHighestBid} per unit.`,
      type: 'auction',
    });
  }

  res.json({ success: true, data: auction });
});

module.exports = { createAuction, getAuctions, getAuctionById, placeBid, closeAuction, processBid };
