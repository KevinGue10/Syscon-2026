const express = require('express');
const registrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { paperIdParamValidation } = require('../validations/registrationValidations');

const router = express.Router();

router.use(authMiddleware);
router.delete('/:id', paperIdParamValidation, validationMiddleware, registrationController.deletePaper);

module.exports = router;
