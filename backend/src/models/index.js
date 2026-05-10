const User = require('./User');
const EventEdition = require('./EventEdition');
const Registration = require('./Registration');
const Paper = require('./Paper');
const Payment = require('./Payment');
const PaymentStatusHistory = require('./PaymentStatusHistory');
const PricingRule = require('./PricingRule');
const AuditLog = require('./AuditLog');
const Country = require('./Country');
const DollarRate = require('./DollarRate');
const Coupon = require('./Coupon');
const EmailLog = require('./EmailLog');
const CustomField = require('./CustomField');
const CustomFieldValue = require('./CustomFieldValue');

let initialized = false;

const initModels = () => {
  if (initialized) {
    return;
  }

  User.hasMany(Registration, { foreignKey: 'userId', as: 'registrations' });
  Registration.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Country.hasMany(User, { foreignKey: 'countryId', as: 'users' });
  User.belongsTo(Country, { foreignKey: 'countryId', as: 'country' });

  EventEdition.hasMany(Registration, { foreignKey: 'eventEditionId', as: 'registrations' });
  Registration.belongsTo(EventEdition, { foreignKey: 'eventEditionId', as: 'eventEdition' });

  EventEdition.hasMany(PricingRule, { foreignKey: 'eventEditionId', as: 'pricingRules' });
  PricingRule.belongsTo(EventEdition, { foreignKey: 'eventEditionId', as: 'eventEdition' });

  Registration.hasMany(Paper, { foreignKey: 'registrationId', as: 'papers', onDelete: 'CASCADE' });
  Paper.belongsTo(Registration, { foreignKey: 'registrationId', as: 'registration' });

  Registration.hasMany(Payment, { foreignKey: 'registrationId', as: 'payments', onDelete: 'CASCADE' });
  Payment.belongsTo(Registration, { foreignKey: 'registrationId', as: 'registration' });
  Payment.hasMany(PaymentStatusHistory, { foreignKey: 'paymentId', as: 'statusHistory', onDelete: 'CASCADE' });
  PaymentStatusHistory.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
  User.hasMany(Payment, { foreignKey: 'validatedBy', as: 'validatedPayments' });
  Payment.belongsTo(User, { foreignKey: 'validatedBy', as: 'validator' });
  User.hasMany(PaymentStatusHistory, { foreignKey: 'changedBy', as: 'paymentStatusChanges' });
  PaymentStatusHistory.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(EmailLog, { foreignKey: 'userId', as: 'emailLogs' });
  EmailLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Registration.hasMany(EmailLog, { foreignKey: 'registrationId', as: 'emailLogs' });
  EmailLog.belongsTo(Registration, { foreignKey: 'registrationId', as: 'registration' });

  EventEdition.hasMany(CustomField, { foreignKey: 'eventEditionId', as: 'customFields' });
  CustomField.belongsTo(EventEdition, { foreignKey: 'eventEditionId', as: 'eventEdition' });
  CustomField.hasMany(CustomFieldValue, { foreignKey: 'customFieldId', as: 'values', onDelete: 'CASCADE' });
  CustomFieldValue.belongsTo(CustomField, { foreignKey: 'customFieldId', as: 'customField' });
  User.hasMany(CustomFieldValue, { foreignKey: 'userId', as: 'customFieldValues' });
  CustomFieldValue.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Registration.hasMany(CustomFieldValue, { foreignKey: 'registrationId', as: 'customFieldValues' });
  CustomFieldValue.belongsTo(Registration, { foreignKey: 'registrationId', as: 'registration' });
  Paper.hasMany(CustomFieldValue, { foreignKey: 'articleId', as: 'customFieldValues' });
  CustomFieldValue.belongsTo(Paper, { foreignKey: 'articleId', as: 'article' });

  initialized = true;
};

module.exports = {
  initModels,
  User,
  EventEdition,
  Registration,
  Paper,
  Payment,
  PaymentStatusHistory,
  PricingRule,
  AuditLog,
  Country,
  DollarRate,
  Coupon,
  EmailLog,
  CustomField,
  CustomFieldValue,
};
