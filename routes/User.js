const express = require('express');
const router = express.Router();
const { updateUserProfile } = require('../controllers/userController');
const verifyToken = require('../middlewares/verifyToken');

// Route to update user profile
router.put('/profile', verifyToken, updateUserProfile);

module.exports = router;
