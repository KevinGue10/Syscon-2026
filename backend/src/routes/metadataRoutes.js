const express = require('express');
const metadataController = require('../controllers/metadataController');

const router = express.Router();

router.get('/countries', metadataController.listCountries);
router.get('/event-editions', metadataController.listEventEditions);
router.get('/custom-fields', metadataController.listCustomFields);

module.exports = router;
