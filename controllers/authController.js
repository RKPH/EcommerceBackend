const User = require('../models/user');
const { hash, verifyPassword } = require('../untils/hash');  // Import password utility
const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../untils/jwt');  // Import JWT generation utility
const { v4: uuidv4 } = require('uuid'); // Import UUID for generating unique I
// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if the user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password and generate the salt
        const { salt, hashedPassword } = await hash(password);

        // Create the new user
        user = new User({
            name,
            email,
            password: hashedPassword,  // Store the hashed password
            salt,  // Store the salt
        });

        // Save the user to the database
        await user.save();

        // Generate a JWT token
        const sessionID = uuidv4();
        const token = generateJwt(user._id,sessionID);

        const refreshToken = generateRefreshToken(user._id, sessionID);
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',  // Set to true if you're using HTTPS
            sameSite: 'Strict',  // or 'Lax' depending on your needs
            maxAge: 24 * 60 * 60 * 1000,  // 1 day
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
            sameSite: 'Strict',  // or 'Lax'
            maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
        });
        // Respond with success
        res.status(201).json({
            message: 'User registered successfully',
            sessionID,
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login a user
// @route   POST /api/v1/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
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

        // Verify the password
        const isPasswordValid = verifyPassword(user.salt, user.password, password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate a JWT token

        const sessionID = uuidv4();
        const token = generateJwt(user._id,sessionID);

        const refreshToken = generateRefreshToken(user._id, sessionID);
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',  // Set to true if you're using HTTPS
            sameSite: 'Strict',  // or 'Lax' depending on your needs
            maxAge: 24 * 60 * 60 * 1000,  // 1 day
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
            sameSite: 'Strict',  // or 'Lax'
            maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
        });
        // Send response
        res.status(200).json({
            message: 'Login successful',
            token,
            sessionID,
            refreshToken,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },

        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private (Protected by token)
// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private (Protected by token)
exports.getUserProfile = async (req, res) => {
    try {
        // console.log('User from token:', req.user);  // Log the user data from the token
        const { userId, sessionID,LoggedinSession } = req.user;  // Destructure from req.user
        // console.log("user at get profile", req.user);
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'User profile fetched successfully',
            sessionID,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};


// @desc    Refresh access token using refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Private (Requires valid refresh token)
exports.refreshAccessToken = async (req, res) => {
    try {
       const refreshToken  = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.refreshToken;
        // console.log("Cookies in refreshAccessToken:", refreshToken);

        // Check if the refresh token is present
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }

        // Verify the refresh token
        const decoded = verifyRefreshToken(refreshToken);  // Ensure this is a valid decoded payload
        // console.log("decoded in refreshAccessToken:", decoded);

        if (!decoded) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        // Generate a new access token using the decoded user ID
        const token = generateJwt(decoded.userId.toString(),decoded.sessionID.toString());  // Assuming `decoded.userId` is a string
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000,
        })
        // Respond with the new access token
        res.status(200).json({
            message: 'New access token generated successfully',
            token,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
};
// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
    try {
        // Clear authentication cookies
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use true in production for HTTPS
            sameSite: 'Strict',
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use true in production for HTTPS
            sameSite: 'Strict',
        });

        // Optionally, log out the action or handle token invalidation if stored in DB
        console.log('User logged out and cookies cleared.');

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error.message);
        res.status(500).json({ message: 'Server error during logout' });
    }
};




