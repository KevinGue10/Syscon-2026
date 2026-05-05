const { body, param } = require('express-validator');
const { MEMBER_TYPES, PARTICIPANT_TYPES, ATTENDANCE_TYPES } = require('../constants/enums');

const pricingRuleBodyValidation = [
  body('eventEditionId').isInt({ min: 1 }).withMessage('eventEditionId is required.'),
  body('name').trim().notEmpty().withMessage('name is required.'),
  body('participationType').isIn(Object.values(PARTICIPANT_TYPES)).withMessage('Invalid participationType.'),
  body('memberType').isIn(Object.values(MEMBER_TYPES)).withMessage('Invalid memberType.'),
  body('attendanceType').isIn(Object.values(ATTENDANCE_TYPES)).withMessage('Invalid attendanceType.'),
  body('baseAmount').isFloat({ min: 0 }).withMessage('baseAmount must be a positive number.'),
  body('extraArticleAmount').isFloat({ min: 0 }).withMessage('extraArticleAmount must be a positive number.'),
  body('lateFeeAmount').isFloat({ min: 0 }).withMessage('lateFeeAmount must be a positive number.'),
  body('discountAmount').isFloat({ min: 0 }).withMessage('discountAmount must be a positive number.'),
  body('startsAt').optional({ nullable: true }).isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('isActive').optional().isBoolean(),
];

module.exports = {
  pricingRuleBodyValidation,
};
