const asyncHandler = require('../utils/asyncHandler');
const registrationService = require('../services/registrationService');
const { calculateRegistrationTotals } = require('../services/pricingService');

const createRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.createRegistration(req.body, req.user);
  res.status(201).json({
    message: 'Registration created successfully.',
    registration: result.registration,
    paymentSummary: result.breakdown,
  });
});

const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await registrationService.getMyRegistrations(req.user);
  res.json({ registrations });
});

const getRegistrationById = asyncHandler(async (req, res) => {
  const registration = await registrationService.getRegistrationById(req.params.id, req.user);
  res.json({ registration });
});

const updateRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.updateRegistration(req.params.id, req.body, req.user);
  res.json({
    message: 'Registration updated successfully.',
    registration: result.registration,
    paymentSummary: result.breakdown,
  });
});

const addPaper = asyncHandler(async (req, res) => {
  const result = await registrationService.addPaperToRegistration(req.params.id, req.body, req.user);
  res.status(201).json({
    message: 'Paper added successfully.',
    paper: result.paper,
    paymentSummary: result.summary.breakdown,
  });
});

const deletePaper = asyncHandler(async (req, res) => {
  const result = await registrationService.removePaper(req.params.id, req.user);
  res.json({
    message: 'Paper removed successfully.',
    registration: result.registration,
    paymentSummary: result.breakdown,
  });
});

const getPaymentSummary = asyncHandler(async (req, res) => {
  await registrationService.getRegistrationById(req.params.id, req.user);
  const result = await calculateRegistrationTotals(req.params.id);
  const registration = await registrationService.getRegistrationById(req.params.id, req.user);
  res.json({
    registration,
    paymentSummary: result.breakdown,
  });
});

module.exports = {
  createRegistration,
  getMyRegistrations,
  getRegistrationById,
  updateRegistration,
  addPaper,
  deletePaper,
  getPaymentSummary,
};
