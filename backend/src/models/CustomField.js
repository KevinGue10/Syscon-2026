const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_APPLIES_TO } = require('../constants/enums');

class CustomField extends Model {}

CustomField.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventEditionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'event_edition_id',
    },
    fieldKey: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      field: 'field_key',
    },
    label: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    fieldType: {
      type: DataTypes.ENUM(...Object.values(CUSTOM_FIELD_TYPES)),
      allowNull: false,
      field: 'field_type',
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_required',
    },
    optionsJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'options_json',
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'display_order',
    },
    appliesTo: {
      type: DataTypes.ENUM(...Object.values(CUSTOM_FIELD_APPLIES_TO)),
      allowNull: false,
      field: 'applies_to',
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
    modelName: 'CustomField',
    tableName: 'custom_fields',
    timestamps: false,
  }
);

module.exports = CustomField;
