const Settlement = require('../models/Settlement');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/settlements/:id
const getSettlementById = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id)
    .populate('farmer', 'name email')
    .populate({ path: 'payment', populate: { path: 'lot', populate: 'commodity' } });
  if (!settlement) return res.status(404).json({ success: false, message: 'Settlement not found' });
  res.json({ success: true, data: settlement });
});

// GET /api/settlements?farmer=
const getSettlements = asyncHandler(async (req, res) => {
  const { farmer } = req.query;
  const filter = {};
  if (farmer) filter.farmer = farmer;
  const settlements = await Settlement.find(filter)
    .populate('farmer', 'name')
    .populate({ path: 'payment', populate: { path: 'lot', populate: 'commodity' } })
    .sort({ createdAt: -1 });
  res.json({ success: true, data: settlements });
});

module.exports = { getSettlementById, getSettlements };
