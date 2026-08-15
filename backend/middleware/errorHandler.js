export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err.stack || err);
  res.status(status).json({
    success: false,
    message: err.message || 'Server error',
    ...(err.details ? { details: err.details } : {}),
  });
}
