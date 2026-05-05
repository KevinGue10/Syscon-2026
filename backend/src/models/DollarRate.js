const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class DollarRate extends Model {}

DollarRate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    rate: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_date',
    },
  },
  {
    sequelize,
    modelName: 'DollarRate',
    tableName: 'dollar_rates',
    timestamps: false,
  }
);

module.exports = DollarRate;
