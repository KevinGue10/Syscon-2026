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
    paymentProofMimeType: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'payment_proof_mime_type',
    },
    paymentProofSizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'payment_proof_size_bytes',
    },
    paymentProofBucketKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'payment_proof_bucket_key',
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
    includesTour: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'includes_tour',
    },
    includesTax: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'includes_tax',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'tax_amount',
    },
    requiresInvoice: {
      type: DataTypes.VIRTUAL,
      get() {
        const includesTax = this.getDataValue('includesTax');
        const providerResponseJson = this.getDataValue('providerResponseJson') || {};
        return Boolean(
          includesTax !== undefined
            ? includesTax
            : providerResponseJson.requiresInvoice !== undefined
            ? providerResponseJson.requiresInvoice
            : providerResponseJson.includeTaxes
        );
      },
      set() {
        throw new Error('Do not try to set the `requiresInvoice` value.');
      },
    },
    includesTaxes: {
      type: DataTypes.VIRTUAL,
      get() {
        const includesTax = this.getDataValue('includesTax');
        const providerResponseJson = this.getDataValue('providerResponseJson') || {};
        return Boolean(
          includesTax !== undefined
            ? includesTax
            : providerResponseJson.includeTaxes !== undefined
            ? providerResponseJson.includeTaxes
            : providerResponseJson.requiresInvoice
        );
      },
      set() {
        throw new Error('Do not try to set the `includesTaxes` value.');
      },
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
