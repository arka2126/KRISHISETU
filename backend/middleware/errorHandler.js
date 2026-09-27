// Central error handler - keeps API responses consistent across the app
const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

// Wraps async controllers so thrown errors are forwarded to errorHandler
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
