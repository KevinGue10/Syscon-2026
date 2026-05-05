const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { PAPER_STATUSES } = require('../constants/enums');

class Paper extends Model {}

Paper.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    registrationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'registration_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    paperCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'paper_code',
    },
    authors: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    pages: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PAPER_STATUSES)),
      allowNull: false,
      defaultValue: PAPER_STATUSES.REGISTERED,
    },
    extraChargeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'extra_charge_amount',
    },
  },
  {
    sequelize,
    modelName: 'Paper',
    tableName: 'articles',
  }
);

module.exports = Paper;
