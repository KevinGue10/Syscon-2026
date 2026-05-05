const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Country extends Model {}

Country.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Country',
    tableName: 'countries',
  }
);

module.exports = Country;
