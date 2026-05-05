const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { PARTICIPANT_TYPES, MEMBER_TYPES, ATTENDANCE_TYPES } = require('../constants/enums');

class PricingRule extends Model {}

PricingRule.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    eventEditionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'event_edition_id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    participationType: {
      type: DataTypes.ENUM(...Object.values(PARTICIPANT_TYPES)),
      allowNull: false,
      field: 'participation_type',
    },
    attendanceType: {
      type: DataTypes.ENUM(...Object.values(ATTENDANCE_TYPES)),
      allowNull: false,
      field: 'attendance_type',
    },
    memberType: {
      type: DataTypes.ENUM(...Object.values(MEMBER_TYPES)),
      allowNull: false,
      field: 'member_type',
    },
    baseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    extraArticleAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'extra_article_amount',
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
    lateFeeAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'late_fee_amount',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'discount_amount',
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
