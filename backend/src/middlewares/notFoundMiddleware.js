const { sendError } = require('../utils/responseContract');

const notFoundMiddleware = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: "Resource not found.",
  });
};

module.exports = notFoundMiddleware;
