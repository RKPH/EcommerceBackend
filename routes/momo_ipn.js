const express = require('express');
const { momoIPNHandler } = require('../Services/Momo_ipn');
const router = express.Router();

// MoMo IPN Webhook Route
router.post('/webhook/momo-ipn', momoIPNHandler);

module.exports = router;
