const express = require('express');
const router = express.Router();
const {getAllTypes} = require('../controllers/typeController');

router.get('/get', getAllTypes);

module.exports = router;