const { ValidationError } = require('sequelize');
const { sendError } = require('../utils/responseContract');

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
    path: req.path,
    message: error.message,
    name: error.name,
    statusCode: error.statusCode || 500,
    location: getErrorLocation(error),
  });

  if (error instanceof ValidationError) {
    return sendError(res, {
      statusCode: 400,
      message: 'Revisa los campos marcados.',
      errors: error.errors.map((item) => ({
        field: item.path || item.validatorKey || 'database',
        message: item.message,
      })),
    });
  }

  const statusCode = error.statusCode || 500;

  return sendError(res, {
    statusCode,
    message: error.message || 'No fue posible procesar la solicitud.',
    errors: error.errors || undefined,
  });
};

module.exports = errorMiddleware;
