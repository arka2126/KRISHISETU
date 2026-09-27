// Quality Assessor workflow: submit test parameters, issue a digital certificate
const QualityReport = require('../models/QualityReport');
const Lot = require('../models/Lot');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

// POST /api/quality-reports
const createQualityReport = asyncHandler(async (req, res) => {
  const { lot, moisture, foreignMatter, grainSize, damagedPercentage, otherParameters, grade } = req.body;

  if (!lot || moisture === undefined || foreignMatter === undefined || !grade) {
    return res.status(400).json({ success: false, message: 'Missing required quality fields' });
  }

  const lotDoc = await Lot.findById(lot).populate('farmer', '_id');
  if (!lotDoc) return res.status(404).json({ success: false, message: 'Lot not found' });

  const report = await QualityReport.create({
    lot,
    assessor: req.user._id,
    moisture,
    foreignMatter,
    grainSize,
    damagedPercentage,
    otherParameters,
    grade,
  });

  lotDoc.qualityReport = report._id;
  lotDoc.status = 'quality_done';
  await lotDoc.save();

  const io = req.app.get('io');
  await notify(io, {
    userId: lotDoc.farmer._id,
    title: 'Quality report completed',
    message: `Quality certificate for lot ${lotDoc.lotId} is ready — grade ${grade}.`,
    type: 'quality',
  });

  res.status(201).json({ success: true, data: report });
});

// GET /api/quality-reports/:lotId  (lotId here is the Lot's Mongo _id)
const getQualityReportByLot = asyncHandler(async (req, res) => {
  const report = await QualityReport.findOne({ lot: req.params.lotId })
    .populate('assessor', 'name')
    .populate({ path: 'lot', populate: [{ path: 'commodity' }, { path: 'farmer', select: 'name' }] });
  if (!report) return res.status(404).json({ success: false, message: 'No quality report found for this lot' });
  res.json({ success: true, data: report });
});

// GET /api/quality-reports/pending  (lots awaiting a quality test)
const getPendingQualityLots = asyncHandler(async (req, res) => {
  const lots = await Lot.find({ status: { $in: ['gate_entry', 'weighed', 'quality_pending'] } })
    .populate('farmer', 'name')
    .populate('commodity', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: lots });
});

module.exports = { createQualityReport, getQualityReportByLot, getPendingQualityLots };
