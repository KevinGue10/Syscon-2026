const express = require('express');
const authRoutes = require('./authRoutes');
const registrationRoutes = require('./registrationRoutes');
const paperRoutes = require('./paperRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const metadataRoutes = require('./metadataRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/registrations', registrationRoutes);
router.use('/papers', paperRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/metadata', metadataRoutes);
router.use('/users', userRoutes);

module.exports = router;
