const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const {
  PARTICIPANT_TYPES,
  ATTENDANCE_TYPES,
  MEMBER_TYPES,
  REGISTRATION_PAYMENT_STATUSES,
  REGISTRATION_STATUSES,
} = require('../constants/enums');

class Registration extends Model {}

Registration.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'user_id',
    },
    eventEditionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'event_edition_id',
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
    isIeeeMember: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_ieee_member',
    },
    membershipNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'membership_number',
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount',
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'paid_amount',
    },
    pendingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'pending_amount',
    },
    paymentStatus: {
      type: DataTypes.ENUM(...Object.values(REGISTRATION_PAYMENT_STATUSES)),
      allowNull: false,
      defaultValue: REGISTRATION_PAYMENT_STATUSES.PENDING,
      field: 'payment_status',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(REGISTRATION_STATUSES)),
      allowNull: false,
      defaultValue: REGISTRATION_STATUSES.DRAFT,
    },
  },
  {
    sequelize,
    modelName: 'Registration',
    tableName: 'registrations',
  }
);

module.exports = Registration;
