// Gate entry + lot lifecycle management (mandi staff primarily, farmers can view)
const Lot = require('../models/Lot');
const { lotId: generateLotId, gateEntryId: generateGateEntryId } = require('../utils/idGenerator');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../services/auditService');
const { notify } = require('../services/notificationService');
const Auction = require('../models/Auction');

// POST /api/lots  (mandi staff creates gate entry + lot together for prototype simplicity)
const createLot = asyncHandler(async (req, res) => {
  const {
    farmer,
    commodity,
    variety,
    mandi,
    vehicleNumber,
    quantity,
    weight,
    basePrice,
    reservePrice,
  } = req.body;

  if (!farmer || !commodity || !mandi || !quantity || !basePrice || !reservePrice) {
    return res.status(400).json({ success: false, message: 'Missing required lot fields' });
  }

  const lot = await Lot.create({
    lotId: generateLotId(),
    gateEntryId: generateGateEntryId(),
    farmer,
    commodity,
    variety,
    mandi,
    vehicleNumber,
    quantity,
    weight,
    basePrice,
    reservePrice,
    status: weight ? 'weighed' : 'gate_entry',
    createdBy: req.user._id,
  });

  await logAction({ userId: req.user._id, action: 'LOT_CREATED', entity: 'Lot', entityId: lot._id });
  const io = req.app.get('io');
  await notify(io, {
    userId: farmer,
    title: 'New lot registered',
    message: `Your lot ${lot.lotId} has been registered at ${mandi}.`,
    type: 'lot',
  });

  res.status(201).json({ success: true, data: lot });
});

// GET /api/lots?status=&farmer=&mandi=&commodity=&page=&limit=
const getLots = asyncHandler(async (req, res) => {
  const { status, farmer, mandi, commodity, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (farmer) filter.farmer = farmer;
  if (mandi) filter.mandi = mandi;
  if (commodity) filter.commodity = commodity;

  const lots = await Lot.find(filter)
    .populate('farmer', 'name phone')
    .populate('commodity', 'name unit category')
    .populate('qualityReport')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Lot.countDocuments(filter);

  res.json({ success: true, data: lots, total, page: Number(page), limit: Number(limit) });
});

// GET /api/lots/:id
const getLotById = asyncHandler(async (req, res) => {
  const lot = await Lot.findById(req.params.id)
    .populate('farmer', 'name phone email')
    .populate('commodity')
    .populate('qualityReport');
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' });
  res.json({ success: true, data: lot });
});

// PUT /api/lots/:id  (update weight, status, approve/reject)
const updateLot = asyncHandler(async (req, res) => {
  const allowedFields = ['weight', 'status', 'basePrice', 'reservePrice'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const lot = await Lot.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('farmer', 'name');
  if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' });

  await logAction({
    userId: req.user._id,
    action: 'LOT_UPDATED',
    entity: 'Lot',
    entityId: lot._id,
    metadata: updates,
  });

  if (updates.status === 'approved') {
  // Create a live auction automatically when the lot is approved.
  const existingAuction = await Auction.findOne({ lot: lot._id });

  if (!existingAuction) {
    const durationMinutes = Number(process.env.AUCTION_DURATION_MINUTES) || 30;
    const startTime = new Date();
    const endTime = new Date(
      startTime.getTime() + durationMinutes * 60 * 1000
    );

    await Auction.create({
      lot: lot._id,
      startTime,
      endTime,
      basePrice: lot.basePrice,
      reservePrice: lot.reservePrice,
      minimumIncrement: 25,
      currentHighestBid: lot.basePrice,
      status: 'active'
    });

    // Change the lot state from approved to currently being auctioned.
    lot.status = 'in_auction';
    await lot.save();
  }

  const io = req.app.get('io');
    await notify(io, {
      userId: lot.farmer._id,
      title: 'Lot approved',
      message: `Your lot ${lot.lotId} has been approved and is ready for auction.`,
      type: 'lot',
    });
  }

  res.json({ success: true, data: lot });
});

module.exports = { createLot, getLots, getLotById, updateLot };
