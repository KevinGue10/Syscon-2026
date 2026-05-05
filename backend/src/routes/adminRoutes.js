const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { pricingRuleBodyValidation } = require('../validations/pricingRuleValidations');
const { customFieldBodyValidation } = require('../validations/customFieldValidations');
const { param } = require('express-validator');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/users', adminController.listUsers);
router.get('/registrations', adminController.listRegistrations);
router.get('/payments', adminController.listPayments);
router.get('/papers', adminController.listPapers);
router.get('/dashboard', adminController.getDashboard);
router.get('/pricing-rules', adminController.listPricingRules);
router.get('/event-editions', adminController.listEventEditions);
router.get('/countries', adminController.listCountries);
router.get('/dollar-rates', adminController.listDollarRates);
router.get('/custom-fields', adminController.listCustomFields);
router.post('/pricing-rules', pricingRuleBodyValidation, validationMiddleware, adminController.createPricingRule);
router.post('/custom-fields', customFieldBodyValidation, validationMiddleware, adminController.createCustomField);
router.put(
  '/pricing-rules/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid pricing rule id is required.'), ...pricingRuleBodyValidation],
  validationMiddleware,
  adminController.updatePricingRule
);
router.put(
  '/custom-fields/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid custom field id is required.'), ...customFieldBodyValidation],
  validationMiddleware,
  adminController.updateCustomField
);
router.get('/exports/users', adminController.exportUsers);
router.get('/exports/registrations', adminController.exportRegistrations);
router.get('/exports/payments', adminController.exportPayments);
router.get('/exports/papers', adminController.exportPapers);

module.exports = router;
