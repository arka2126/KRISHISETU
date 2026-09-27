const express = require('express');
const {
  createQualityReport,
  getQualityReportByLot,
  getPendingQualityLots,
} = require('../controllers/qualityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/pending', protect, authorize('quality_assessor', 'admin'), getPendingQualityLots);
router.get('/:lotId', protect, getQualityReportByLot);
router.post('/', protect, authorize('quality_assessor', 'admin'), createQualityReport);

module.exports = router;
