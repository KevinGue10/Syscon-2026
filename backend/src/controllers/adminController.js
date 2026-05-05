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

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['passwordHash'] },
    include: [{ association: 'country', required: false }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ users });
});

const listRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.findAll({
    include: ['user', 'eventEdition', 'papers', 'payments'],
    order: [['createdAt', 'DESC']],
  });
  res.json({ registrations });
});

const listPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.findAll({
    include: [{ association: 'registration', include: ['user', 'eventEdition'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ payments });
});

const listPapers = asyncHandler(async (req, res) => {
  const papers = await Paper.findAll({
    include: [{ association: 'registration', include: ['user', 'eventEdition'] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ papers });
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

  res.json({
    metrics: {
      usersCount,
      registrationsCount,
      papersCount,
      approvedPaymentsTotal: Number(approvedPaymentsTotal || 0),
      paymentStatusGroups,
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
  res.status(201).json({
    message: 'Pricing rule created successfully.',
    pricingRule,
  });
});

const updatePricingRule = asyncHandler(async (req, res) => {
  const pricingRule = await PricingRule.findByPk(req.params.id);
  if (!pricingRule) {
    return res.status(404).json({ message: 'Pricing rule not found.' });
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

  res.json({
    message: 'Pricing rule updated successfully.',
    pricingRule,
  });
});

const listPricingRules = asyncHandler(async (req, res) => {
  const pricingRules = await PricingRule.findAll({
    include: ['eventEdition'],
    order: [['createdAt', 'DESC']],
  });
  res.json({ pricingRules });
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
      { header: 'Affiliation', key: 'affiliation' },
      { header: 'Phone', key: 'phoneNumber' },
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
  res.json({ eventEditions });
});

const listCountries = asyncHandler(async (req, res) => {
  const countries = await Country.findAll({ order: [['name', 'ASC']] });
  res.json({ countries });
});

const listDollarRates = asyncHandler(async (req, res) => {
  const rates = await DollarRate.findAll({ order: [['effectiveDate', 'DESC']] });
  res.json({ rates });
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
  res.json({ customFields });
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
  res.status(201).json({
    message: 'Custom field created successfully.',
    customField,
  });
});

const updateCustomField = asyncHandler(async (req, res) => {
  const customField = await CustomField.findByPk(req.params.id);
  if (!customField) {
    return res.status(404).json({ message: 'Custom field not found.' });
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

  res.json({
    message: 'Custom field updated successfully.',
    customField,
  });
});

module.exports = {
  listUsers,
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
