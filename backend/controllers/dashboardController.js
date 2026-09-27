// Aggregation endpoints that power the four role dashboards
const Lot = require('../models/Lot');
const Auction = require('../models/Auction');
const Payment = require('../models/Payment');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/dashboard/farmer  (uses req.user as the farmer)
const farmerDashboard = asyncHandler(async (req, res) => {
  const farmerId = req.user._id;
  const [totalLots, activeAuctions, soldLots, settlements] = await Promise.all([
    Lot.countDocuments({ farmer: farmerId }),
    Auction.countDocuments({ status: 'active', lot: { $in: await Lot.find({ farmer: farmerId }).distinct('_id') } }),
    Lot.countDocuments({ farmer: farmerId, status: 'sold' }),
    Settlement.find({ farmer: farmerId }),
  ]);

  const totalSales = settlements.reduce((sum, s) => sum + s.grossAmount, 0);
  const pendingPayments = settlements.filter((s) => s.status !== 'settled').length;

  res.json({
    success: true,
    data: {
      totalLots,
      activeAuctions,
      soldLots,
      totalSales,
      pendingPayments,
      recentSettlements: settlements.slice(-5).reverse(),
    },
  });
});

// GET /api/dashboard/buyer
const buyerDashboard = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;
  const [activeBids, auctionsWon, purchases] = await Promise.all([
    Auction.countDocuments({ status: 'active', highestBidder: buyerId }),
    Auction.countDocuments({ status: 'closed_sold', highestBidder: buyerId }),
    Payment.find({ buyer: buyerId }),
  ]);

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingPayments = await Auction.countDocuments({ status: 'closed_sold', highestBidder: buyerId })
    - purchases.length;

  res.json({
    success: true,
    data: {
      activeBids,
      auctionsWon,
      totalPurchases,
      pendingPayments: Math.max(pendingPayments, 0),
      recentPurchases: purchases.slice(-5).reverse(),
    },
  });
});

// GET /api/dashboard/mandi
const mandiDashboard = asyncHandler(async (req, res) => {
  const [pendingGateEntries, lotsAwaitingQuality, scheduledAuctions, activeAuctions] = await Promise.all([
    Lot.countDocuments({ status: 'gate_entry' }),
    Lot.countDocuments({ status: { $in: ['weighed', 'quality_pending'] } }),
    Auction.countDocuments({ status: 'scheduled' }),
    Auction.countDocuments({ status: 'active' }),
  ]);

  res.json({
    success: true,
    data: { pendingGateEntries, lotsAwaitingQuality, scheduledAuctions, activeAuctions },
  });
});

// GET /api/dashboard/admin
const adminDashboard = asyncHandler(async (req, res) => {
  const [totalFarmers, totalBuyers, activeAuctions, completedAuctions, transactions, mandiCount] = await Promise.all([
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'buyer' }),
    Auction.countDocuments({ status: 'active' }),
    Auction.countDocuments({ status: { $in: ['closed_sold', 'closed_unsold'] } }),
    Payment.find({ status: 'paid' }),
    Lot.distinct('mandi'),
  ]);

  const totalTradeValue = transactions.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalFeesRevenue = transactions.reduce((sum, p) => sum + p.mandiFee + p.platformFee, 0);

  res.json({
    success: true,
    data: {
      totalFarmers,
      totalBuyers,
      activeAuctions,
      completedAuctions,
      totalTransactions: transactions.length,
      totalTradeValue,
      totalFeesRevenue,
      registeredMandis: mandiCount.length,
    },
  });
});

module.exports = { farmerDashboard, buyerDashboard, mandiDashboard, adminDashboard };
