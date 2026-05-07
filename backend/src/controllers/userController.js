const sequelize = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseContract');
const userService = require('../services/userService');
const registrationService = require('../services/registrationService');

const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateCurrentUser(req.user, req.body);

  return sendSuccess(res, {
    message: 'Información del usuario actualizada correctamente.',
    data: { user },
  });
});

const updateFullDetails = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const user = await userService.updateCurrentUser(req.user, req.body.user || {}, { transaction });
    const registrationResult = await registrationService.updateRegistration(
      req.params.id,
      req.body.registration || {},
      req.user,
      { transaction }
    );

    return {
      user,
      registration: registrationResult.registration,
      paymentSummary: registrationResult.breakdown,
    };
  });

  return sendSuccess(res, {
    message: 'Información actualizada correctamente.',
    data: result,
  });
});

module.exports = {
  updateMe,
  updateFullDetails,
};
