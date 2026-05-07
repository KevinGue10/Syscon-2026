const { validationResult } = require('express-validator');
const { sendError } = require('../utils/responseContract');

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return sendError(res, {
    statusCode: 422,
    message: 'Revisa los campos marcados.',
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};

module.exports = validationMiddleware;
