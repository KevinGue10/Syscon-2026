const { body } = require('express-validator');
const { MEMBER_TYPES, PARTICIPANT_TYPES } = require('../constants/enums');

const pricingRuleBodyValidation = [
  body('eventEditionId').isInt({ min: 1 }).withMessage('eventEditionId is required.'),
  body('name').trim().notEmpty().withMessage('name is required.'),
  body('participationType').optional({ nullable: true }).isIn(Object.values(PARTICIPANT_TYPES)).withMessage('Invalid participationType.'),
  body('memberType').optional({ nullable: true }).isIn(Object.values(MEMBER_TYPES)).withMessage('Invalid memberType.'),
  body('isIeeeMember').optional().isBoolean().withMessage('isIeeeMember must be boolean.'),
  body('isTems').optional().isBoolean().withMessage('isTems must be boolean.'),
  body('baseAmount').isFloat({ min: 0 }).withMessage('baseAmount must be a positive number.'),
  body('startsAt').optional({ nullable: true }).isISO8601(),
  body('endsAt').optional({ nullable: true }).isISO8601(),
  body('isActive').optional().isBoolean(),
];

module.exports = {
  pricingRuleBodyValidation,
};
