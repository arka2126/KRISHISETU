const Commodity = require('../models/Commodity');
const { asyncHandler } = require('../middleware/errorHandler');

const getCommodities = asyncHandler(async (req, res) => {
  const commodities = await Commodity.find().sort({ name: 1 });
  res.json({ success: true, data: commodities });
});

const createCommodity = asyncHandler(async (req, res) => {
  const commodity = await Commodity.create(req.body);
  res.status(201).json({ success: true, data: commodity });
});

module.exports = { getCommodities, createCommodity };
