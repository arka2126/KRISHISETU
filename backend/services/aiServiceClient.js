// Thin HTTP client the Node backend uses to talk to the Python AI/ML service
// (ai-service/, FastAPI). Every method mirrors one FastAPI endpoint 1:1 so
// controllers stay simple. Errors from the AI service (4xx/5xx, or the service
// being down) are normalized into a single AIServiceError the controllers can
// turn into a clean HTTP response instead of a raw axios stack trace leaking out.

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const client = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 15000,
});

class AIServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
  }
}

async function call(method, path, body) {
  try {
    const res = await client.request({ method, url: path, data: body });
    return res.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
      throw new AIServiceError(
        'AI service is unavailable. Is the FastAPI service running (ai-service/)?',
        503
      );
    }
    if (err.response) {
      // Forward FastAPI's own error detail (validation errors, "not trained yet", etc.)
      const detail = err.response.data && err.response.data.detail;
      throw new AIServiceError(
        typeof detail === 'string' ? detail : 'AI service rejected the request',
        err.response.status
      );
    }
    throw new AIServiceError(err.message);
  }
}

module.exports = {
  AIServiceError,
  health: () => call('get', '/health'),
  modelStatus: () => call('get', '/api/v1/model-status'),
  train: (payload) => call('post', '/api/v1/train', payload),
  predictPrice: (payload) => call('post', '/api/v1/predict-price', payload),
  forecast: (payload) => call('post', '/api/v1/forecast', payload),
  trendAnalysis: (payload) => call('post', '/api/v1/trend-analysis', payload),
  anomalyDetection: (payload) => call('post', '/api/v1/anomaly-detection', payload),
  marketComparison: (payload) => call('post', '/api/v1/market-comparison', payload),
  demandSupply: (payload) => call('post', '/api/v1/demand-supply', payload),
  recommendations: (payload) => call('post', '/api/v1/recommendations', payload),
  marketInsights: (payload) => call('post', '/api/v1/market-insights', payload),
};
