const { body, param } = require('express-validator');
const { MEMBER_TYPES, PARTICIPANT_TYPES, REGISTRATION_STATUSES, ATTENDANCE_TYPES } = require('../constants/enums');

const registrationIdParamValidation = [param('id').isInt({ min: 1 }).withMessage('Valid registration id is required.')];
const paperIdParamValidation = [param('id').isInt({ min: 1 }).withMessage('Valid paper id is required.')];

const createRegistrationValidation = [
  body('eventEditionId').optional().isInt({ min: 1 }).withMessage('eventEditionId must be a positive integer.'),
  body('participationType')
    .isIn(Object.values(PARTICIPANT_TYPES))
    .withMessage('participationType must be attendee or author.'),
  body('attendanceType')
    .isIn(Object.values(ATTENDANCE_TYPES))
    .withMessage('attendanceType must be in_person or virtual.'),
  body('memberType')
    .isIn(Object.values(MEMBER_TYPES))
    .withMessage('memberType must be a valid member type.'),
  body('isIeeeMember').optional().isBoolean(),
  body('membershipNumber').optional().isString(),
  body('customFieldValues').optional().isArray(),
  body('status')
    .optional()
    .isIn(Object.values(REGISTRATION_STATUSES))
    .withMessage('Invalid registration status.'),
];

const updateRegistrationValidation = [
  ...registrationIdParamValidation,
  body('eventEditionId').optional().isInt({ min: 1 }).withMessage('eventEditionId must be a positive integer.'),
  body('participationType').optional().isIn(Object.values(PARTICIPANT_TYPES)),
  body('attendanceType').optional().isIn(Object.values(ATTENDANCE_TYPES)),
  body('memberType').optional().isIn(Object.values(MEMBER_TYPES)),
  body('isIeeeMember').optional().isBoolean(),
  body('membershipNumber').optional({ nullable: true }).isString(),
  body('customFieldValues').optional().isArray(),
  body('status').optional().isIn(Object.values(REGISTRATION_STATUSES)),
];

const addPaperValidation = [
  ...registrationIdParamValidation,
  body('title').trim().notEmpty().withMessage('Paper title is required.'),
  body('paperCode').trim().notEmpty().withMessage('paperCode is required.'),
  body('authors').isArray({ min: 1 }).withMessage('authors must be a non-empty array.'),
  body('pages').optional().isInt({ min: 1 }),
  body('customFieldValues').optional().isArray(),
];

module.exports = {
  registrationIdParamValidation,
  paperIdParamValidation,
  createRegistrationValidation,
  updateRegistrationValidation,
  addPaperValidation,
};
