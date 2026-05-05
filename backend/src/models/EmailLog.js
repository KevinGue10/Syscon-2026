const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { EMAIL_LOG_STATUSES } = require('../constants/enums');

class EmailLog extends Model {}

EmailLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    registrationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'registration_id',
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    templateName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'template_name',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(EMAIL_LOG_STATUSES)),
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'sent_at',
    },
  },
  {
    sequelize,
    modelName: 'EmailLog',
    tableName: 'email_logs',
    timestamps: false,
  }
);

module.exports = EmailLog;
