const express = require('express');
const { handlePayOSConfirmWebhook } = require('../Services/Payos_ipn');
const router = express.Router();

// Payos Webhook Route
router.post('/webhook/payos', handlePayOSConfirmWebhook);

module.exports = router;
