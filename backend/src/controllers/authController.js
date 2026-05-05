const bcrypt = require('bcrypt');
const { User, EventEdition } = require('../models');
const { signToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendWelcomeEmail } = require('../services/emailService');
const { createAuditLog } = require('../services/auditService');
const { saveCustomFieldValues } = require('../services/customFieldService');

const register = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ where: { email: req.body.email.toLowerCase() } });
  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email.toLowerCase(),
    passwordHash,
    countryId: req.body.countryId,
    city: req.body.city,
    affiliation: req.body.affiliation,
    phoneNumber: req.body.phoneNumber,
  });

  const activeEventEdition = await EventEdition.findOne({ where: { isActive: true } });
  if (activeEventEdition) {
    await saveCustomFieldValues({
      eventEditionId: activeEventEdition.id,
      appliesTo: 'user',
      values: req.body.customFieldValues || [],
      entityIds: { userId: user.id },
    });
  }

  const token = signToken({ userId: user.id, role: user.role });
  await createAuditLog({
    userId: user.id,
    action: 'register',
    entity: 'user',
    entityId: user.id,
    newValue: sanitizeUser(user),
  });
  await sendWelcomeEmail(user);

  res.status(201).json({
    message: 'User registered successfully.',
    token,
    user: sanitizeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email.toLowerCase() } });
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    message: 'Login successful.',
    token,
    user: sanitizeUser(user),
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: sanitizeUser(req.user),
  });
});

module.exports = {
  register,
  login,
  me,
};
