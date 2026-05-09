const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { PARTICIPANT_TYPES, MEMBER_TYPES } = require('../constants/enums');

class PricingRule extends Model {}

PricingRule.init(
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
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    participationType: {
      type: DataTypes.ENUM(...Object.values(PARTICIPANT_TYPES)),
      allowNull: true,
      field: 'participation_type',
    },
    memberType: {
      type: DataTypes.ENUM(...Object.values(MEMBER_TYPES)),
      allowNull: true,
      field: 'member_type',
    },
    isIeeeMember: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_ieee_member',
    },
    isTems: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_tems',
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    startsAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'starts_at',
    },
    endsAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'ends_at',
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
    modelName: 'PricingRule',
    tableName: 'pricing_rules',
  }
);

module.exports = PricingRule;
