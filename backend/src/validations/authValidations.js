const { body } = require('express-validator');

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('countryId').isInt({ min: 1 }).withMessage('countryId is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('address').optional({ nullable: true }).isString(),
  body('birthDate').optional({ nullable: true }).isISO8601().withMessage('birthDate must be a valid date.'),
  body('gender').optional({ nullable: true }).isString(),
  body('docType').optional({ nullable: true }).isString(),
  body('docNumber').optional({ nullable: true }).isString(),
  body('affiliation').trim().notEmpty().withMessage('Affiliation is required.'),
  body('phoneNumber').trim().notEmpty().withMessage('phoneNumber is required.'),
  body('occupation').optional({ nullable: true }).isString(),
  body('customFieldValues').optional().isArray(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('newPassword must be at least 8 characters long.'),
];

module.exports = {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  changePasswordValidation,
};
