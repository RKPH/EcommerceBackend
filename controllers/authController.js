const User = require('../models/user');
const Cart = require('../models/cart');
const { hash, verifyPassword } = require('../utils/hash');
const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        let user_id;
        do {
            user_id = Math.floor(Math.random() * (10000000 - 10000) + 10000);
        } while (await User.findOne({ user_id }));

        const { salt, hashedPassword } = await hash(password);

        user = new User({ name, email, user_id, password: hashedPassword, salt });
        await user.save();

        const sessionID = uuidv4();
        const token = generateJwt(user._id, sessionID);
        const refreshToken = generateRefreshToken(user._id, sessionID);

        res.cookie('accessToken', token, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 86400000 });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 2592000000 });

        res.status(201).json({
            message: 'User registered successfully',
            sessionID,
            token,
            refreshToken,
            user: { id: user._id, user_id: user.user_id, name: user.name, email: user.email },
        });
    } catch (error) {
        console.error('Error registering user:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login a user
// @route   POST /api/v1/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'All fields are required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid email or password' });

        const isPasswordValid = await verifyPassword(user.salt, user.password, password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid email or password' });

        const sessionID = uuidv4();
        const token = generateJwt(user._id, sessionID);
        const refreshToken = generateRefreshToken(user._id, sessionID);

        res.cookie('accessToken', token, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 86400000 });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 2592000000 });

        res.status(200).json({
            message: 'Login successful',
            sessionID,
            token,
            refreshToken,
            user: { id: user._id, user_id: user.user_id, name: user.name, email: user.email, address: user.address },
        });
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const { userId, sessionID } = req.user;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cartCount = await Cart.countDocuments({ user: user._id });

        res.status(200).json({
            message: 'User profile fetched successfully',
            sessionID,
            user: { id: user._id, name: user.name, user_id: user.user_id, email: user.email, cart: cartCount, address: user.address },
        });
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Private
exports.refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken || req.header('Authorization')?.replace('Bearer ', '');
        if (!refreshToken) return res.status(401).json({ message: 'No refresh token provided' });

        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) return res.status(401).json({ message: 'Invalid or expired refresh token' });

        const accessToken = generateJwt(decoded.userId, decoded.sessionID);
        const newRefreshToken = generateRefreshToken(decoded.userId, decoded.sessionID);

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 86400000 });
        res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 2592000000 });

        res.status(200).json({ message: 'New access token generated successfully', token: accessToken, refreshToken: newRefreshToken });
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
    try {
        res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'Strict' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'Strict' });

        console.log('User logged out successfully.');
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error.message);
        res.status(500).json({ message: 'Server error during logout' });
    }
};
