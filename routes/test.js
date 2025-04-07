const express = require('express');
const router = express.Router();
const { sendVerificationEmail } = require('../Services/Email');

// Test email endpoint
router.post('/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Send a test verification email
        const success = await sendVerificationEmail(email, '123456'); // Using a test code

        if (success) {
            res.status(200).json({
                success: true,
                message: 'Test email sent successfully',
                data: { email }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email'
            });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending test email',
            error: error.message
        });
    }
});

module.exports = router; 