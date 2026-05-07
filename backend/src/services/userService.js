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

const getUserProfile = async (userId, options = {}) => {
  const { transaction } = options;
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      { association: 'country', required: false },
      {
        association: 'customFieldValues',
        required: false,
        include: [{ association: 'customField', required: false }],
      },
    ],
    transaction,
  });

  if (!user) {
    throw new AppError('Usuario no encontrado.', 404);
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
    throw new AppError('Revisa los campos marcados.', 422, [
      { field: 'docNumber', message: 'El número de documento ya se encuentra registrado.' },
    ]);
  }
};

const updateCurrentUser = async (currentUser, payload, options = {}) => {
  const { transaction } = options;
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

module.exports = {
  USER_PROFILE_FIELDS,
  getUserProfile,
  updateCurrentUser,
  sanitizeUser,
};
