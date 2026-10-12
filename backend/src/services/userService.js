const { Op } = require('sequelize');
const { User, EventEdition } = require('../models');
const AppError = require('../utils/errors');
const { saveCustomFieldValues } = require('./customFieldService');
const { sanitizeUser } = require('../utils/response');

const USER_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'countryId',
  'city',
  'address',
  'birthDate',
  'gender',
  'docType',
  'docNumber',
  'affiliation',
  'phoneNumber',
  'occupation',
];

const ensureUserIsActive = (user, message = "The account is disabled.") => {
  if (!user?.active) {
    throw new AppError(message, 403);
  }
};

const getUserProfile = async (userId, options = {}) => {
  const { transaction } = options;
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      { association: 'country', required: false },
      {
        association: 'customFieldValues',
        required: false,
        separate: true,
        order: [['id', 'ASC']],
        include: [{ association: 'customField', required: false }],
      },
    ],
    transaction,
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return user;
};

const validateUniqueDocNumber = async (docNumber, userId, options = {}) => {
  if (!docNumber) {
    return;
  }

  const { transaction } = options;
  const existing = await User.findOne({
    where: {
      docNumber,
      id: { [Op.ne]: userId },
    },
    transaction,
  });

  if (existing) {
    throw new AppError("Check the highlighted fields.", 422, [
      { field: 'docNumber', message: "This ID document number is already registered." },
    ]);
  }
};

const updateCurrentUser = async (currentUser, payload, options = {}) => {
  const { transaction } = options;
  ensureUserIsActive(currentUser);
  await validateUniqueDocNumber(payload.docNumber, currentUser.id, { transaction });

  const updatePayload = {};
  for (const field of USER_PROFILE_FIELDS) {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field];
    }
  }

  await currentUser.update(updatePayload, { transaction });

  const activeEventEdition = await EventEdition.findOne({
    where: { isActive: true },
    order: [['year', 'DESC']],
    transaction,
  });

  if (activeEventEdition) {
    await saveCustomFieldValues({
      eventEditionId: activeEventEdition.id,
      appliesTo: 'user',
      values: payload.customFieldValues || [],
      entityIds: { userId: currentUser.id },
      transaction,
    });
  }

  return getUserProfile(currentUser.id, { transaction });
};

const setUserActiveStatus = async (userId, active, actor, options = {}) => {
  const { transaction } = options;
  const user = await User.findByPk(userId, { transaction });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (actor?.id === user.id && active === false) {
    throw new AppError("You cannot disable your own account.", 400);
  }

  const normalizedActive = Boolean(active);
  if (user.active === normalizedActive) {
    return user;
  }

  await user.update({ active: normalizedActive }, { transaction });
  return user;
};

module.exports = {
  USER_PROFILE_FIELDS,
  ensureUserIsActive,
  getUserProfile,
  updateCurrentUser,
  setUserActiveStatus,
  sanitizeUser,
};
