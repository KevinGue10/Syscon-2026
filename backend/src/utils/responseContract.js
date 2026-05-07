const sendSuccess = (res, { statusCode = 200, message, data = {} }) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

const sendError = (res, { statusCode = 400, message, errors }) => {
  const payload = {
    success: false,
    message,
  };

  if (errors && errors.length) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
