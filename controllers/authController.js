const User = require('../models/user');
const { hash, verifyPassword } = require('../untils/hash');  // Import password utility
const { generateJwt, generateRefreshToken } = require('../untils/jwt');  // Import JWT generation utility

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
        const token = generateJwt(user._id);
        const refreshToken = generateRefreshToken(token);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Secure cookie, not accessible from JavaScript
            secure: false, // Set to true in production if using HTTPS
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        // Respond with success
        res.status(201).json({
            message: 'User registered successfully',
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
        const isPasswordValid =verifyPassword(user.salt, user.password, password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate a JWT token
        const token = generateJwt(user._id);
        const refreshToken = generateRefreshToken(token);

        res.cookie('refreshToken', refreshToken, {

            maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
            path: '/',  // Ensure the cookie is accessible to the entire app
        });
        console.log("Cookies after setting refreshToken:", req.cookies);
        // Send response
        res.status(200).json({
            message: 'Login successful',
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
// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private (Protected by token)
exports.getUserProfile = async (req, res) => {
    try {
        console.log(req.user);
        // The userId is available in req.userId, added by the protectRoute middleware
        const user = await User.findById(req.user.userId);

        // If user not found, return 404
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with the user's profile data
        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

