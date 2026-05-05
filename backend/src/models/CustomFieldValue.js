const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class CustomFieldValue extends Model {}

CustomFieldValue.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    customFieldId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'custom_field_id',
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
    articleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'article_id',
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CustomFieldValue',
    tableName: 'custom_field_values',
    timestamps: false,
  }
);

module.exports = CustomFieldValue;
