const { fn, col } = require('sequelize');
const {
  User,
  Registration,
  Payment,
  Paper,
  PricingRule,
  EventEdition,
  Country,
  DollarRate,
  CustomField,
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { buildWorkbook } = require('../services/exportService');
const { calculateRegistrationTotals } = require('../services/pricingService');
const { createAuditLog } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/responseContract');

const normalizeCustomFieldValues = (values = []) =>
  values.map((item) => ({
    id: item.id,
    customFieldId: item.customFieldId,
    value: item.value,
    customField: item.customField
      ? {
          id: item.customField.id,
          fieldKey: item.customField.fieldKey,
          label: item.customField.label,
          fieldType: item.customField.fieldType,
          appliesTo: item.customField.appliesTo,
        }
      : null,
  }));

const buildPersonalInformation = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  countryId: user.countryId,
  country: user.country || null,
  city: user.city,
  address: user.address,
  birthDate: user.birthDate,
  gender: user.gender,
  docType: user.docType,
  docNumber: user.docNumber,
  affiliation: user.affiliation,
  phoneNumber: user.phoneNumber,
  occupation: user.occupation,
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['passwordHash'] },
    include: [{ association: 'country', required: false }],
    order: [['createdAt', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Usuarios obtenidos correctamente.',
    data: { users },
  });
});

const getUserRegistrationDetails = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.userId, {
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

  if (!user) {
    return sendError(res, {
      statusCode: 404,
      message: 'Usuario no encontrado.',
    });
  }

  const registrations = await Registration.findAll({
    where: { userId: user.id },
    include: [
      { association: 'eventEdition', required: false },
      {
        association: 'payments',
        required: false,
      },
      {
        association: 'customFieldValues',
        required: false,
        include: [{ association: 'customField', required: false }],
      },
      {
        association: 'papers',
        required: false,
        include: [
          {
            association: 'customFieldValues',
            required: false,
            include: [{ association: 'customField', required: false }],
          },
        ],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: Payment, as: 'payments' }, 'createdAt', 'DESC'],
      [{ model: Paper, as: 'papers' }, 'createdAt', 'DESC'],
    ],
  });

  const data = {
    personalInformation: buildPersonalInformation(user),
    user: {
      ...user.toJSON(),
      customFieldValues: normalizeCustomFieldValues(user.customFieldValues),
    },
    registrations: registrations.map((registration) => ({
      ...registration.toJSON(),
      paymentSummary: {
        totalAmount: registration.totalAmount,
        paidAmount: registration.paidAmount,
        pendingAmount: registration.pendingAmount,
        paymentStatus: registration.paymentStatus,
      },
      customFieldValues: normalizeCustomFieldValues(registration.customFieldValues),
      papers: (registration.papers || []).map((paper) => ({
        ...paper.toJSON(),
        customFieldValues: normalizeCustomFieldValues(paper.customFieldValues),
      })),
    })),
  };

  return sendSuccess(res, {
    message: 'Detalle del usuario obtenido correctamente.',
    data,
  });
});

const listRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.findAll({
    include: ['user', 'eventEdition', 'papers', 'payments'],
    order: [['createdAt', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Inscripciones obtenidas correctamente.',
    data: { registrations },
  });
});

const listPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({
    include: [{ association: 'registration', include: ['user', 'eventEdition'] }],
    order: [['createdAt', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Pagos obtenidos correctamente.',
    data: { payments },
  });
});

const listPapers = asyncHandler(async (req, res) => {
  const papers = await Paper.findAll({
    include: [{ association: 'registration', include: ['user', 'eventEdition'] }],
    order: [['createdAt', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Artículos obtenidos correctamente.',
    data: { papers },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const [usersCount, registrationsCount, papersCount, approvedPaymentsTotal, paymentStatusGroups] = await Promise.all([
    User.count(),
    Registration.count(),
    Paper.count(),
    Payment.sum('amountUsd', { where: { status: 'approved' } }),
    Registration.findAll({
      attributes: ['paymentStatus', [fn('COUNT', col('id')), 'count']],
      group: ['paymentStatus'],
      raw: true,
    }),
  ]);

  return sendSuccess(res, {
    message: 'Métricas obtenidas correctamente.',
    data: {
      metrics: {
      usersCount,
      registrationsCount,
      papersCount,
      approvedPaymentsTotal: Number(approvedPaymentsTotal || 0),
      paymentStatusGroups,
      },
    },
  });
});

const createPricingRule = asyncHandler(async (req, res) => {
  const pricingRule = await PricingRule.create(req.body);
  await createAuditLog({
    userId: req.user.id,
    action: 'create',
    entity: 'pricingRule',
    entityId: pricingRule.id,
    newValue: pricingRule.toJSON(),
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Regla de precios creada correctamente.',
    data: { pricingRule },
  });
});

const updatePricingRule = asyncHandler(async (req, res) => {
  const pricingRule = await PricingRule.findByPk(req.params.id);
  if (!pricingRule) {
    return sendError(res, {
      statusCode: 404,
      message: 'Regla de precios no encontrada.',
    });
  }

  const oldValue = pricingRule.toJSON();
  await pricingRule.update(req.body);

  const registrations = await Registration.findAll({
    where: {
      eventEditionId: pricingRule.eventEditionId,
      participationType: pricingRule.participationType,
      memberType: pricingRule.memberType,
      attendanceType: pricingRule.attendanceType,
    },
  });

  await Promise.all(registrations.map((registration) => calculateRegistrationTotals(registration.id)));
  await createAuditLog({
    userId: req.user.id,
    action: 'update',
    entity: 'pricingRule',
    entityId: pricingRule.id,
    oldValue,
    newValue: pricingRule.toJSON(),
  });

  return sendSuccess(res, {
    message: 'Regla de precios actualizada correctamente.',
    data: { pricingRule },
  });
});

const listPricingRules = asyncHandler(async (req, res) => {
  const pricingRules = await PricingRule.findAll({
    include: ['eventEdition'],
    order: [['createdAt', 'DESC']],
  });
  return sendSuccess(res, {
    message: 'Reglas de precios obtenidas correctamente.',
    data: { pricingRules },
  });
});

const exportData = async ({ res, fileName, sheetName, columns, rows }) => {
  const buffer = await buildWorkbook({ sheetName, columns, rows });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=\"${fileName}\"`);
  res.send(Buffer.from(buffer));
};

const exportUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['passwordHash'] }, raw: true });
  await exportData({
    res,
    fileName: 'users.xlsx',
    sheetName: 'Users',
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'First Name', key: 'firstName' },
      { header: 'Last Name', key: 'lastName' },
      { header: 'Email', key: 'email' },
      { header: 'Country ID', key: 'countryId' },
      { header: 'City', key: 'city' },
      { header: 'Address', key: 'address' },
      { header: 'Birth Date', key: 'birthDate' },
      { header: 'Gender', key: 'gender' },
      { header: 'Document Type', key: 'docType' },
      { header: 'Document Number', key: 'docNumber' },
      { header: 'Affiliation', key: 'affiliation' },
      { header: 'Phone', key: 'phoneNumber' },
      { header: 'Occupation', key: 'occupation' },
      { header: 'Role', key: 'role' },
      { header: 'Created At', key: 'createdAt' },
    ],
    rows: users,
  });
});

const exportRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.findAll({
    include: ['user', 'eventEdition'],
  });

  await exportData({
    res,
    fileName: 'registrations.xlsx',
    sheetName: 'Registrations',
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'User', key: 'user' },
      { header: 'Event', key: 'event' },
      { header: 'Participation Type', key: 'participationType' },
      { header: 'Attendance Type', key: 'attendanceType' },
      { header: 'Member Type', key: 'memberType' },
      { header: 'Total Amount', key: 'totalAmount' },
      { header: 'Paid Amount', key: 'paidAmount' },
      { header: 'Pending Amount', key: 'pendingAmount' },
      { header: 'Payment Status', key: 'paymentStatus' },
      { header: 'Status', key: 'status' },
      { header: 'Created At', key: 'createdAt' },
    ],
    rows: registrations.map((registration) => ({
      id: registration.id,
      user: `${registration.user.firstName} ${registration.user.lastName}`,
      event: registration.eventEdition.name,
      participationType: registration.participationType,
      attendanceType: registration.attendanceType,
      memberType: registration.memberType,
      totalAmount: registration.totalAmount,
      paidAmount: registration.paidAmount,
      pendingAmount: registration.pendingAmount,
      paymentStatus: registration.paymentStatus,
      status: registration.status,
      createdAt: registration.createdAt,
    })),
  });
});

const exportPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({
    include: [{ association: 'registration', include: ['user'] }],
  });

  await exportData({
    res,
    fileName: 'payments.xlsx',
    sheetName: 'Payments',
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Registration ID', key: 'registrationId' },
      { header: 'User', key: 'user' },
      { header: 'Amount USD', key: 'amountUsd' },
      { header: 'Amount COP', key: 'amountCop' },
      { header: 'Currency', key: 'currency' },
      { header: 'Method', key: 'paymentMethod' },
      { header: 'Reference', key: 'transactionReference' },
      { header: 'Status', key: 'status' },
      { header: 'Payment Date', key: 'paymentDate' },
    ],
    rows: payments.map((payment) => ({
      ...payment.toJSON(),
      user: `${payment.registration.user.firstName} ${payment.registration.user.lastName}`,
    })),
  });
});

const exportPapers = asyncHandler(async (req, res) => {
  const papers = await Paper.findAll({
    include: [{ association: 'registration', include: ['user'] }],
  });

  await exportData({
    res,
    fileName: 'papers.xlsx',
    sheetName: 'Papers',
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Registration ID', key: 'registrationId' },
      { header: 'User', key: 'user' },
      { header: 'Title', key: 'title' },
      { header: 'Paper Code', key: 'paperCode' },
      { header: 'Status', key: 'status' },
      { header: 'Extra Charge', key: 'extraChargeAmount' },
      { header: 'Created At', key: 'createdAt' },
    ],
    rows: papers.map((paper) => ({
      ...paper.toJSON(),
      user: `${paper.registration.user.firstName} ${paper.registration.user.lastName}`,
    })),
  });
});

const listEventEditions = asyncHandler(async (req, res) => {
  const eventEditions = await EventEdition.findAll({ order: [['year', 'DESC']] });
  return sendSuccess(res, {
    message: 'Ediciones del evento obtenidas correctamente.',
    data: { eventEditions },
  });
});

const listCountries = asyncHandler(async (req, res) => {
  const countries = await Country.findAll({ order: [['name', 'ASC']] });
  return sendSuccess(res, {
    message: 'Países obtenidos correctamente.',
    data: { countries },
  });
});

const listDollarRates = asyncHandler(async (req, res) => {
  const rates = await DollarRate.findAll({ order: [['effectiveDate', 'DESC']] });
  return sendSuccess(res, {
    message: 'Tasas de cambio obtenidas correctamente.',
    data: { rates },
  });
});

const listCustomFields = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.eventEditionId) {
    where.eventEditionId = Number(req.query.eventEditionId);
  }
  if (req.query.appliesTo) {
    where.appliesTo = req.query.appliesTo;
  }

  const customFields = await CustomField.findAll({
    where,
    include: ['eventEdition'],
    order: [['displayOrder', 'ASC'], ['id', 'ASC']],
  });
  return sendSuccess(res, {
    message: 'Campos personalizados obtenidos correctamente.',
    data: { customFields },
  });
});

const createCustomField = asyncHandler(async (req, res) => {
  const customField = await CustomField.create(req.body);
  await createAuditLog({
    userId: req.user.id,
    action: 'create',
    entity: 'customField',
    entityId: customField.id,
    newValue: customField.toJSON(),
  });
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Campo personalizado creado correctamente.',
    data: { customField },
  });
});

const updateCustomField = asyncHandler(async (req, res) => {
  const customField = await CustomField.findByPk(req.params.id);
  if (!customField) {
    return sendError(res, {
      statusCode: 404,
      message: 'Campo personalizado no encontrado.',
    });
  }

  const oldValue = customField.toJSON();
  await customField.update(req.body);
  await createAuditLog({
    userId: req.user.id,
    action: 'update',
    entity: 'customField',
    entityId: customField.id,
    oldValue,
    newValue: customField.toJSON(),
  });

  return sendSuccess(res, {
    message: 'Campo personalizado actualizado correctamente.',
    data: { customField },
  });
});

module.exports = {
  listUsers,
  getUserRegistrationDetails,
  listRegistrations,
  listPayments,
  listPapers,
  getDashboard,
  createPricingRule,
  updatePricingRule,
  listPricingRules,
  exportUsers,
  exportRegistrations,
  exportPayments,
  exportPapers,
  listEventEditions,
  listCountries,
  listDollarRates,
  listCustomFields,
  createCustomField,
  updateCustomField,
};
