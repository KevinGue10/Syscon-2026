const asyncHandler = require('../utils/asyncHandler');
const registrationService = require('../services/registrationService');
const { calculateRegistrationTotals } = require('../services/pricingService');
const { sendSuccess } = require('../utils/responseContract');
const userService = require('../services/userService');
const sequelize = require('../config/database');

const hasUserProfileFields = (payload = {}) =>
  userService.USER_PROFILE_FIELDS.some((field) => payload[field] !== undefined) ||
  payload.customFieldValues !== undefined;

const createRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.createRegistration(req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Inscripción creada correctamente.',
    data: {
      registration: result.registration,
      paymentSummary: result.breakdown,
    },
  });
});

const getMyRegistrations = asyncHandler(async (req, res) => {
  const result = await registrationService.getMyRegistrations(req.user);
  return sendSuccess(res, {
    message: 'Inscripciones obtenidas correctamente.',
    data: {
      user: result.user,
      registrations: result.registrations,
    },
  });
});

const getRegistrationById = asyncHandler(async (req, res) => {
  const registration = await registrationService.getRegistrationById(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Inscripción obtenida correctamente.',
    data: { registration },
  });
});

const updateRegistration = asyncHandler(async (req, res) => {
  let result;
  let updatedUser = null;

  if (hasUserProfileFields(req.body)) {
    result = await sequelize.transaction(async (transaction) => {
      updatedUser = await userService.updateCurrentUser(req.user, req.body, { transaction });
      return registrationService.updateRegistration(req.params.id, req.body, req.user, { transaction });
    });
  } else {
    result = await registrationService.updateRegistration(req.params.id, req.body, req.user);
  }

  return sendSuccess(res, {
    message: 'Inscripción actualizada correctamente.',
    data: {
      ...(updatedUser ? { user: updatedUser } : {}),
      registration: result.registration,
      paymentSummary: result.breakdown,
    },
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

const addPaper = asyncHandler(async (req, res) => {
  const result = await registrationService.addPaperToRegistration(req.params.id, req.body, req.user);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Artículo agregado correctamente.',
    data: {
      paper: result.paper,
      paymentSummary: result.summary.breakdown,
    },
  });
});

const deletePaper = asyncHandler(async (req, res) => {
  const result = await registrationService.removePaper(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Artículo eliminado correctamente.',
    data: {
      registration: result.registration,
      paymentSummary: result.breakdown,
    },
  });
});

const getPaymentSummary = asyncHandler(async (req, res) => {
  await registrationService.getRegistrationById(req.params.id, req.user);
  const result = await calculateRegistrationTotals(req.params.id);
  const registration = await registrationService.getRegistrationById(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Resumen de pago obtenido correctamente.',
    data: {
      registration,
      paymentSummary: result.breakdown,
    },
  });
});

module.exports = {
  createRegistration,
  getMyRegistrations,
  getRegistrationById,
  updateRegistration,
  updateFullDetails,
  addPaper,
  deletePaper,
  getPaymentSummary,
};
