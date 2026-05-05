const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class EventEdition extends Model {}

EventEdition.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_active',
    },
  },
  {
    sequelize,
    modelName: 'EventEdition',
    tableName: 'event_editions',
  }
);

module.exports = EventEdition;
