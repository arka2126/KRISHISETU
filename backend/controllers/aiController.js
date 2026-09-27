const aiService = require('../services/aiServiceClient');
const { asyncHandler } = require('../middleware/errorHandler');

// Every handler follows: call the AI service, return its JSON as-is under
// `data` (it's already shaped for the frontend), and let asyncHandler forward
// AIServiceError to the central error handler with the right status code.

const health = asyncHandler(async (req, res) => {
  const data = await aiService.health();
  res.json({ success: true, data });
});

const modelStatus = asyncHandler(async (req, res) => {
  const data = await aiService.modelStatus();
  res.json({ success: true, data });
});

const train = asyncHandler(async (req, res) => {
  const data = await aiService.train(req.body);
  res.json({ success: true, data });
});

const predictPrice = asyncHandler(async (req, res) => {
  const data = await aiService.predictPrice(req.body);
  res.json({ success: true, data });
});

const forecast = asyncHandler(async (req, res) => {
  const data = await aiService.forecast(req.body);
  res.json({ success: true, data });
});

const trendAnalysis = asyncHandler(async (req, res) => {
  const data = await aiService.trendAnalysis(req.body);
  res.json({ success: true, data });
});

const anomalyDetection = asyncHandler(async (req, res) => {
  const data = await aiService.anomalyDetection(req.body);
  res.json({ success: true, data });
});

const marketComparison = asyncHandler(async (req, res) => {
  const data = await aiService.marketComparison(req.body);
  res.json({ success: true, data });
});

const demandSupply = asyncHandler(async (req, res) => {
  const data = await aiService.demandSupply(req.body);
  res.json({ success: true, data });
});

const recommendations = asyncHandler(async (req, res) => {
  const data = await aiService.recommendations(req.body);
  res.json({ success: true, data });
});

const marketInsights = asyncHandler(async (req, res) => {
  const data = await aiService.marketInsights(req.body);
  res.json({ success: true, data });
});

module.exports = {
  health,
  modelStatus,
  train,
  predictPrice,
  forecast,
  trendAnalysis,
  anomalyDetection,
  marketComparison,
  demandSupply,
  recommendations,
  marketInsights,
};
