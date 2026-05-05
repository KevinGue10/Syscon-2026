const { body } = require('express-validator');

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
  body('countryId').isInt({ min: 1 }).withMessage('countryId is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('affiliation').trim().notEmpty().withMessage('Affiliation is required.'),
  body('phoneNumber').trim().notEmpty().withMessage('phoneNumber is required.'),
  body('customFieldValues').optional().isArray(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = {
  registerValidation,
  loginValidation,
};
