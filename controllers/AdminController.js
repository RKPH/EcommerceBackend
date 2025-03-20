
    const User = require('../models/user');
    const {  verifyPassword } = require('../utils/hash');  // Import password utility
    const { generateJwt, generateRefreshToken} = require('../utils/jwt');  // Import JWT generation utility
    const { v4: uuidv4 } = require('uuid');





    const loginAdmin = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if the user exists
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Check if the user is an admin
            if (user.role !== 'admin') {
                return res.status(403).json({ message: 'Access denied. Only admins can log in.' });
            }

            // Check if the account is verified
            if (!user.isVerified) {
                return res.status(403).json({ message: 'Account not verified. Please check your email to verify your account.' });
            }

            // Verify the password
            const isPasswordValid = verifyPassword(user.salt, user.password, password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate a JWT token
            const sessionID = uuidv4();
            const token = generateJwt(user._id, sessionID);
            const refreshToken = generateRefreshToken(user._id, sessionID);

            // Set cookies for authentication
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            // Send response
            res.status(200).json({
                message: 'Admin login successful',
                token,
                refreshToken,
                user: {
                    id: user._id,
                    sessionID: sessionID,
                    user_id: user.user_id,
                    avatar: user.avatar,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };






    module.exports = {

        loginAdmin
    };
