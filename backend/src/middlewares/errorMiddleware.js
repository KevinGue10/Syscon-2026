const { ValidationError } = require('sequelize');

const getErrorLocation = (error) => {
  if (!error || !error.stack) {
    return null;
  }

  const lines = String(error.stack)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '));

  const usefulLine = lines.find(
    (line) =>
      !line.includes('node_modules') &&
      (line.includes('\\src\\') || line.includes('/src/'))
  );

  return usefulLine || lines[0] || null;
};

const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error('[API ERROR]', {
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    name: error.name,
    statusCode: error.statusCode || 500,
    location: getErrorLocation(error),
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: 'Database validation failed.',
      errors: error.errors.map((item) => item.message),
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message: error.message || 'Internal server error.',
  });
};

module.exports = errorMiddleware;
