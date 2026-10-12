const { body } = require('express-validator');
const { GENDERS, DOCUMENT_TYPES } = require('../constants/enums');

const userProfileValidation = [
  body('firstName').trim().notEmpty().withMessage("First name is required."),
  body('lastName').trim().notEmpty().withMessage("Last name is required."),
  body('countryId').isInt({ min: 1 }).withMessage("Country is required."),
  body('city').trim().notEmpty().withMessage("City is required."),
  body('address').trim().notEmpty().withMessage("Address is required."),
  body('birthDate').isISO8601().withMessage("Date of birth is required and must be valid."),
  body('gender').isIn(Object.values(GENDERS)).withMessage("Gender is required and must be valid."),
  body('docType').isIn(Object.values(DOCUMENT_TYPES)).withMessage("ID document type is required and must be valid."),
  body('docNumber').trim().notEmpty().withMessage("ID document number is required."),
  body('affiliation').trim().notEmpty().withMessage("Affiliation is required."),
  body('phoneNumber').trim().notEmpty().withMessage("Phone number is required."),
  body('occupation').trim().notEmpty().withMessage("Occupation is required."),
  body('customFieldValues').optional().isArray(),
];

const fullDetailsValidation = [
  body('user.firstName').trim().notEmpty().withMessage("First name is required."),
  body('user.lastName').trim().notEmpty().withMessage("Last name is required."),
  body('user.countryId').isInt({ min: 1 }).withMessage("Country is required."),
  body('user.city').trim().notEmpty().withMessage("City is required."),
  body('user.address').trim().notEmpty().withMessage("Address is required."),
  body('user.birthDate').isISO8601().withMessage("Date of birth is required and must be valid."),
  body('user.gender').isIn(Object.values(GENDERS)).withMessage("Gender is required and must be valid."),
  body('user.docType').isIn(Object.values(DOCUMENT_TYPES)).withMessage("ID document type is required and must be valid."),
  body('user.docNumber').trim().notEmpty().withMessage("ID document number is required."),
  body('user.affiliation').trim().notEmpty().withMessage("Affiliation is required."),
  body('user.phoneNumber').trim().notEmpty().withMessage("Phone number is required."),
  body('user.occupation').trim().notEmpty().withMessage("Occupation is required."),
  body('user.customFieldValues').optional().isArray(),
  body('registration.eventEditionId').isInt({ min: 1 }).withMessage("Conference edition is required."),
  body('registration.participationType').isIn(['attendee', 'author']).withMessage("Invalid participation type."),
  body('registration.attendanceType').isIn(['in_person', 'virtual']).withMessage("Invalid attendance type."),
  body('registration.memberType')
    .isIn(['ieee_member', 'non_ieee_member', 'student', 'professional'])
    .withMessage("Invalid registration category."),
  body('registration.isIeeeMember').isBoolean().withMessage("IEEE membership status must be true or false."),
  body('registration.includesTour').optional().isBoolean().withMessage("Tour selection must be true or false."),
  body('registration.requiresInvoice').optional().isBoolean().withMessage("Invoice selection must be true or false."),
  body('registration.includeTaxes').optional().isBoolean().withMessage("Tax selection must be true or false."),
  body('registration.status').optional().isIn(['draft', 'submitted', 'confirmed']).withMessage("Invalid status."),
  body('registration.customFieldValues').optional().isArray(),
  body('registration.membershipNumber')
    .if(body('registration.isIeeeMember').equals('true'))
    .trim()
    .notEmpty()
    .withMessage("An IEEE membership number is required for IEEE members."),
];

module.exports = {
  userProfileValidation,
  fullDetailsValidation,
};
