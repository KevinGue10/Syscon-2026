const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Coupon extends Model {}

Coupon.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'Coupon',
    tableName: 'coupons',
    timestamps: false,
  }
);

module.exports = Coupon;
