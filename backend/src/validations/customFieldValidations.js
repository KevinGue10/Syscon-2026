const { body, param } = require('express-validator');
const { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_APPLIES_TO } = require('../constants/enums');

const customFieldBodyValidation = [
  body('eventEditionId').isInt({ min: 1 }).withMessage('eventEditionId is required.'),
  body('fieldKey').trim().notEmpty().withMessage('fieldKey is required.'),
  body('label').trim().notEmpty().withMessage('label is required.'),
  body('fieldType').isIn(Object.values(CUSTOM_FIELD_TYPES)).withMessage('Invalid fieldType.'),
  body('isRequired').optional().isBoolean(),
  body('optionsJson').optional().isArray(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('appliesTo').isIn(Object.values(CUSTOM_FIELD_APPLIES_TO)).withMessage('Invalid appliesTo.'),
  body('isActive').optional().isBoolean(),
];

const customFieldIdValidation = [param('id').isInt({ min: 1 }).withMessage('Valid custom field id is required.')];

module.exports = {
  customFieldBodyValidation,
  customFieldIdValidation,
};
