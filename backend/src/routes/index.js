const express = require('express');
const authRoutes = require('./authRoutes');
const registrationRoutes = require('./registrationRoutes');
const paperRoutes = require('./paperRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const metadataRoutes = require('./metadataRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/registrations', registrationRoutes);
router.use('/papers', paperRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/metadata', metadataRoutes);

module.exports = router;
