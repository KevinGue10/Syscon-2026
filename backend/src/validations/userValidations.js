const { body } = require('express-validator');
const { GENDERS, DOCUMENT_TYPES } = require('../constants/enums');

const userProfileValidation = [
  body('firstName').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('lastName').trim().notEmpty().withMessage('El apellido es obligatorio.'),
  body('countryId').isInt({ min: 1 }).withMessage('El país es obligatorio.'),
  body('city').trim().notEmpty().withMessage('La ciudad es obligatoria.'),
  body('address').trim().notEmpty().withMessage('La dirección es obligatoria.'),
  body('birthDate').isISO8601().withMessage('La fecha de nacimiento es obligatoria y debe ser válida.'),
  body('gender').isIn(Object.values(GENDERS)).withMessage('El género es obligatorio y debe ser válido.'),
  body('docType').isIn(Object.values(DOCUMENT_TYPES)).withMessage('El tipo de documento es obligatorio y debe ser válido.'),
  body('docNumber').trim().notEmpty().withMessage('El número de documento es obligatorio.'),
  body('affiliation').trim().notEmpty().withMessage('La afiliación es obligatoria.'),
  body('phoneNumber').trim().notEmpty().withMessage('El teléfono es obligatorio.'),
  body('occupation').trim().notEmpty().withMessage('La ocupación es obligatoria.'),
  body('customFieldValues').optional().isArray(),
];

const fullDetailsValidation = [
  body('user.firstName').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('user.lastName').trim().notEmpty().withMessage('El apellido es obligatorio.'),
  body('user.countryId').isInt({ min: 1 }).withMessage('El país es obligatorio.'),
  body('user.city').trim().notEmpty().withMessage('La ciudad es obligatoria.'),
  body('user.address').trim().notEmpty().withMessage('La dirección es obligatoria.'),
  body('user.birthDate').isISO8601().withMessage('La fecha de nacimiento es obligatoria y debe ser válida.'),
  body('user.gender').isIn(Object.values(GENDERS)).withMessage('El género es obligatorio y debe ser válido.'),
  body('user.docType').isIn(Object.values(DOCUMENT_TYPES)).withMessage('El tipo de documento es obligatorio y debe ser válido.'),
  body('user.docNumber').trim().notEmpty().withMessage('El número de documento es obligatorio.'),
  body('user.affiliation').trim().notEmpty().withMessage('La afiliación es obligatoria.'),
  body('user.phoneNumber').trim().notEmpty().withMessage('El teléfono es obligatorio.'),
  body('user.occupation').trim().notEmpty().withMessage('La ocupación es obligatoria.'),
  body('user.customFieldValues').optional().isArray(),
  body('registration.eventEditionId').isInt({ min: 1 }).withMessage('La edición del evento es obligatoria.'),
  body('registration.participationType').isIn(['attendee', 'author']).withMessage('El tipo de participación es inválido.'),
  body('registration.attendanceType').isIn(['in_person', 'virtual']).withMessage('El tipo de asistencia es inválido.'),
  body('registration.memberType')
    .isIn(['ieee_member', 'non_ieee_member', 'student', 'professional'])
    .withMessage('La categoría de inscripción es inválida.'),
  body('registration.isIeeeMember').isBoolean().withMessage('El campo isIeeeMember debe ser booleano.'),
  body('registration.includesTour').optional().isBoolean().withMessage('El campo includesTour debe ser booleano.'),
  body('registration.requiresInvoice').optional().isBoolean().withMessage('El campo requiresInvoice debe ser booleano.'),
  body('registration.includeTaxes').optional().isBoolean().withMessage('El campo includeTaxes debe ser booleano.'),
  body('registration.status').optional().isIn(['draft', 'submitted', 'confirmed']).withMessage('El estado es inválido.'),
  body('registration.customFieldValues').optional().isArray(),
  body('registration.membershipNumber')
    .if(body('registration.isIeeeMember').equals('true'))
    .trim()
    .notEmpty()
    .withMessage('El número de membresía es obligatorio para miembros IEEE.'),
];

module.exports = {
  userProfileValidation,
  fullDetailsValidation,
};
