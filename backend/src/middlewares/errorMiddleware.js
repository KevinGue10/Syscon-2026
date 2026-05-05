const { ValidationError } = require('sequelize');

const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

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
