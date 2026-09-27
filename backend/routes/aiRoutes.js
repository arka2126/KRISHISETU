const express = require('express');
const ai = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Read-only market intelligence: accessible for public browsing and logged-in dashboards
router.get('/health', ai.health);
router.get('/model-status', ai.modelStatus);
router.post('/predict-price', ai.predictPrice);
router.post('/forecast', ai.forecast);
router.post('/trend-analysis', ai.trendAnalysis);
router.post('/anomaly-detection', ai.anomalyDetection);
router.post('/market-comparison', ai.marketComparison);
router.post('/demand-supply', ai.demandSupply);
router.post('/recommendations', ai.recommendations);
router.post('/market-insights', ai.marketInsights);

// Training triggers model retraining/CPU work — strictly restricted to admin.
router.post('/train', protect, authorize('admin'), ai.train);

module.exports = router;
