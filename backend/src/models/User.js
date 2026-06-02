const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { USER_ROLES } = require('../constants/enums');

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    countryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'country_id',
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address',
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'birth_date',
    },
    gender: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'gender',
    },
    docType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'doc_type',
    },
    docNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'doc_number',
    },
    affiliation: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'affiliation',
    },
    phoneNumber: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'phone_number',
    },
    occupation: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'occupation',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(USER_ROLES)),
      allowNull: false,
      defaultValue: USER_ROLES.USER,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'active',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  }
);

module.exports = User;
