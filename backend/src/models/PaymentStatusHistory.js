const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { PAYMENT_STATUSES } = require('../constants/enums');

class PaymentStatusHistory extends Model {}

PaymentStatusHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'payment_id',
    },
    previousStatus: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
      allowNull: true,
      field: 'previous_status',
    },
    newStatus: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUSES)),
      allowNull: false,
      field: 'new_status',
    },
    changedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'changed_by',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    providerResponseJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'provider_response_json',
    },
  },
  {
    sequelize,
    modelName: 'PaymentStatusHistory',
    tableName: 'payment_status_history',
  }
);

module.exports = PaymentStatusHistory;
