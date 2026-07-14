const multer = require('multer');

function errorHandler(err, _req, res, _next) {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message,
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
