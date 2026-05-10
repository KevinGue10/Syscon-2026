const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { PAYMENT_STATUSES } = require('../constants/enums');

class Payment extends Model {}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    registrationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'registration_id',
    },
    amountUsd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'amount_usd',
    },
    amountCop: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'amount_cop',
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD',
    },
    paymentMethod: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'payment_method',
    },
    provider: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'manual',
    },
    providerPaymentId: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'provider_payment_id',
    },
    paymentUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'payment_url',
    },
    paymentProofUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'payment_proof_url',
    },
    paymentProofFilename: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'payment_proof_filename',
    },
    providerResponseJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'provider_response_json',
    },
    validatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'validated_by',
    },
    validatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'validated_at',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
    transactionReference: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'transaction_reference',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
      allowNull: false,
      defaultValue: PAYMENT_STATUSES.PENDING,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'payment_date',
    },
  },
  {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
  }
);

module.exports = Payment;
