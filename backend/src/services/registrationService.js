const { EventEdition, Registration, Paper, User } = require('../models');
const { REGISTRATION_STATUSES, USER_ROLES, MEMBER_TYPES } = require('../constants/enums');
const { calculateRegistrationTotals } = require('./pricingService');
const { createAuditLog } = require('./auditService');
const {
  sendPaperRegistrationEmail,
  sendPendingPaymentReminderEmail,
} = require('./emailService');
const { saveCustomFieldValues } = require('./customFieldService');
const AppError = require('../utils/errors');
const { resolveIncludesTour, resolveRequiresInvoice } = require('./pricingService');

const getActiveEventEdition = async () => {
  const eventEdition = await EventEdition.findOne({
    where: { isActive: true },
    order: [['year', 'DESC']],
  });

  if (!eventEdition) {
    throw new AppError('No active event edition available.', 400);
  }

  return eventEdition;
};

const assertRegistrationAccess = (registration, currentUser) => {
  if (!registration) {
    throw new AppError('Registration not found.', 404);
  }

  if (currentUser.role !== USER_ROLES.ADMIN && registration.userId !== currentUser.id) {
    throw new AppError('You do not have access to this registration.', 403);
  }
};

const normalizeRegistrationMemberType = (memberType) => {
  if (memberType === MEMBER_TYPES.STUDENT) {
    return MEMBER_TYPES.STUDENT;
  }

  return MEMBER_TYPES.PROFESSIONAL;
};

const dispatchEmailInBackground = (task, label) => {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`${label} failed:`, error.message);
    });
};

const createRegistration = async (payload, currentUser, options = {}) => {
  const { transaction } = options;
  const eventEdition = payload.eventEditionId
    ? await EventEdition.findByPk(payload.eventEditionId, { transaction })
    : await getActiveEventEdition();

  if (!eventEdition) {
    throw new AppError('Selected event edition was not found.', 404);
  }

  const registration = await Registration.create({
    userId: currentUser.id,
    eventEditionId: eventEdition.id,
    participationType: payload.participationType,
    attendanceType: payload.attendanceType,
    memberType: normalizeRegistrationMemberType(payload.memberType),
    isIeeeMember: payload.isIeeeMember || false,
    isTems: payload.isTems || false,
    includesTour: resolveIncludesTour(payload),
    requiresInvoice: resolveRequiresInvoice(payload),
    membershipNumber: payload.membershipNumber || null,
    status: payload.status || REGISTRATION_STATUSES.DRAFT,
  }, { transaction });

  await saveCustomFieldValues({
    eventEditionId: eventEdition.id,
    appliesTo: 'registration',
    values: payload.customFieldValues || [],
    entityIds: { registrationId: registration.id },
    transaction,
  });

  const summary = await calculateRegistrationTotals(registration.id, {
    transaction,
    allowMissingPricingRule: true,
  });
  await createAuditLog({
    userId: currentUser.id,
    action: 'create',
    entity: 'registration',
    entityId: registration.id,
    newValue: registration.toJSON(),
  });

  return summary;
};

const updateRegistration = async (registrationId, payload, currentUser, options = {}) => {
  const { transaction } = options;
  const registration = await Registration.findByPk(registrationId, { transaction });
  assertRegistrationAccess(registration, currentUser);
  const oldValue = registration.toJSON();

  if (payload.isIeeeMember === true && !payload.membershipNumber && !registration.membershipNumber) {
    throw new AppError('Revisa los campos marcados.', 422, [
      { field: 'membershipNumber', message: 'El número de membresía es obligatorio para miembros IEEE.' },
    ]);
  }

  await registration.update({
    participationType: payload.participationType || registration.participationType,
    attendanceType: payload.attendanceType || registration.attendanceType,
    memberType:
      payload.memberType !== undefined
        ? normalizeRegistrationMemberType(payload.memberType)
        : registration.memberType,
    isIeeeMember: payload.isIeeeMember !== undefined ? payload.isIeeeMember : registration.isIeeeMember,
    isTems: payload.isTems !== undefined ? payload.isTems : registration.isTems,
    includesTour:
      payload.includesTour !== undefined
        ? payload.includesTour
        : registration.includesTour,
    requiresInvoice:
      payload.requiresInvoice !== undefined || payload.includeTaxes !== undefined
        ? resolveRequiresInvoice(payload)
        : registration.requiresInvoice,
    membershipNumber: payload.membershipNumber !== undefined ? payload.membershipNumber : registration.membershipNumber,
    status: payload.status || registration.status,
    eventEditionId: payload.eventEditionId || registration.eventEditionId,
  }, { transaction });

  await saveCustomFieldValues({
    eventEditionId: registration.eventEditionId,
    appliesTo: 'registration',
    values: payload.customFieldValues || [],
    entityIds: { registrationId: registration.id },
    transaction,
  });

  const summary = await calculateRegistrationTotals(registration.id, {
    transaction,
    allowMissingPricingRule: true,
  });
  await createAuditLog({
    userId: currentUser.id,
    action: 'update',
    entity: 'registration',
    entityId: registration.id,
    oldValue,
    newValue: summary.registration.toJSON(),
  });

  if (Number(summary.registration.pendingAmount) > 0) {
    const user = await User.findByPk(registration.userId, { transaction });
    if (user) {
      dispatchEmailInBackground(
        () => sendPendingPaymentReminderEmail(user, summary.registration),
        'Pending payment reminder email'
      );
    }
  }

  return summary;
};

const addPaperToRegistration = async (registrationId, payload, currentUser) => {
  const registration = await Registration.findByPk(registrationId, {
    include: [{ association: 'user' }],
  });
  assertRegistrationAccess(registration, currentUser);

  const paper = await Paper.create({
    registrationId: registration.id,
    title: payload.title,
    paperCode: payload.paperCode,
    authors: payload.authors,
    pages: payload.pages || null,
  });

  await saveCustomFieldValues({
    eventEditionId: registration.eventEditionId,
    appliesTo: 'article',
    values: payload.customFieldValues || [],
    entityIds: { articleId: paper.id },
  });

  const summary = await calculateRegistrationTotals(registration.id);
  const refreshedPaper = await Paper.findByPk(paper.id);

  await createAuditLog({
    userId: currentUser.id,
    action: 'create',
    entity: 'paper',
    entityId: paper.id,
    newValue: refreshedPaper.toJSON(),
  });
  if (registration.user) {
    dispatchEmailInBackground(
      () => sendPaperRegistrationEmail(registration.user, refreshedPaper),
      'Paper registration email'
    );
  }

  return {
    paper: refreshedPaper,
    summary,
  };
};

const removePaper = async (paperId, currentUser) => {
  const paper = await Paper.findByPk(paperId, {
    include: [{ association: 'registration' }],
  });

  if (!paper) {
    throw new AppError('Paper not found.', 404);
  }

  assertRegistrationAccess(paper.registration, currentUser);
  const oldValue = paper.toJSON();
  const registrationId = paper.registrationId;

  await paper.destroy();
  const summary = await calculateRegistrationTotals(registrationId);

  await createAuditLog({
    userId: currentUser.id,
    action: 'delete',
    entity: 'paper',
    entityId: paperId,
    oldValue,
  });

  return summary;
};

const getRegistrationById = async (registrationId, currentUser) => {
  const registration = await Registration.findByPk(registrationId, {
    include: ['user', 'eventEdition', 'papers', 'payments'],
  });
  assertRegistrationAccess(registration, currentUser);
  return registration;
};

const getMyRegistrations = async (currentUser) => {
  const user = await User.findByPk(currentUser.id, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      { association: 'country', required: false },
      {
        association: 'customFieldValues',
        required: false,
        include: [{ association: 'customField', required: false }],
      },
    ],
  });

  const registrations = await Registration.findAll({
    where: { userId: currentUser.id },
    include: ['eventEdition', 'papers', 'payments'],
    order: [['createdAt', 'DESC']],
  });

  return {
    user,
    registrations,
  };
};

module.exports = {
  createRegistration,
  updateRegistration,
  addPaperToRegistration,
  removePaper,
  getRegistrationById,
  getMyRegistrations,
};
