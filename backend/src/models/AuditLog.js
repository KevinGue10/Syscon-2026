const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AuditLog extends Model {}

AuditLog.init(
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
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'entity_id',
    },
    oldValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'old_value',
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'new_value',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: false,
  }
);

module.exports = AuditLog;
