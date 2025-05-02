const authService = require('../Services/authService');
const { verifyRefreshToken } = require('../utils/jwt');

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Please provide name." });
        }
        if (!email) {
            return res.status(400).json({ message: "Please provide email." });
        }
        if (!password) {
            return res.status(400).json({ message: "Please provide password." });
        }

        const { token, refreshToken, user } = await authService.registerUser({ name, email, password });

        // Set cookies
        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            refreshToken,
            user,
        });
    } catch (error) {
        res.status(error.message.includes('User already exists') ? 400 : 500).json({ message: error.message });
    }
};

// @desc    Login a user
// @route   POST /api/v1/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Please provide email." });
        }
        if (!password) {
            return res.status(400).json({ message: "Please provide password." });
        }

        const { token, refreshToken, user } = await authService.loginUser({ email, password });

        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            refreshToken,
            user,
        });
    } catch (error) {
        res.status(error.message.includes('Invalid') || error.message.includes('verified') ? 401 : 500).json({ message: error.message });
    }
};

// @desc    Verify a user
// @route   POST /api/v1/auth/verify
// @access  Private
exports.verifyUser = async (req, res) => {
    try {
        const { userId } = req.user;
        const { verificationCode } = req.body;

        if (!verificationCode) {
            return res.status(400).json({ message: "Please provide verification code." });
        }

        const { user } = await authService.verifyUser({ userId, verificationCode });

        res.status(200).json({
            message: 'User verified successfully',
            user,
        });
    } catch (error) {
        res.status(error.message.includes('Invalid') || error.message.includes('not found') ? 400 : 500).json({ message: error.message });
    }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Please provide email." });
        }

        const result = await authService.forgotPassword({ email });

        res.status(200).json(result);
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500).json({ message: error.message });
    }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Please provide reset token." });
        }
        if (!password) {
            return res.status(400).json({ message: "Please provide new password." });
        }

        const result = await authService.resetPassword({ token, password });

        res.status(200).json(result);
    } catch (error) {
        res.status(error.message.includes('Invalid') ? 400 : 500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/v1/auth/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const { userId, sessionID } = req.user;
        const { user } = await authService.getUserProfile({ userId, sessionID });

        res.status(200).json({
            message: 'User profile fetched successfully',
            user,
        });
    } catch (error) {
        res.status(error.message.includes('not found') ? 404 : 500).json({ message: error.message });
    }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Private
exports.refreshAccessToken = async (req, res) => {
    try {
        let tokenSource = "";
        let token = "";

        if (req.header('Authorization')) {
            token = req.header('Authorization').replace('Bearer ', '');
            tokenSource = "Authorization Header";
        } else if (req.cookies?.refreshToken) {
            token = req.cookies.refreshToken;
            tokenSource = "Cookie";
        }
        console.log("tokenSource", tokenSource);

        if (!token) {
            return res.status(401).json({ message: 'Please provide a refresh token.' });
        }

        const decoded = verifyRefreshToken(token);
        if (!decoded) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const { accessToken, newRefreshToken } = await authService.refreshAccessToken({
            userId: decoded.userId,
            sessionID: decoded.sessionID,
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.status(200).json({
            message: 'New access token generated successfully',
            token: accessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        res.status(error.message.includes('Invalid') || error.message.includes('refresh token') ? 401 : 500).json({ message: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
    try {
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error during logout:', error.message);
        res.status(500).json({ message: 'Server error during logout' });
    }
};

// @desc    Login as admin
// @route   POST /api/v1/auth/admin-login
// @access  Public
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Please provide email." });
        }
        if (!password) {
            return res.status(400).json({ message: "Please provide password." });
        }

        const { token, refreshToken, sessionID, user } = await authService.loginAdminService(email, password);

        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        res.status(200).json({
            message: 'Admin login successful',
            token,
            refreshToken,
            user,
        });
    } catch (error) {
        if (error.message === 'Invalid email or password') {
            return res.status(401).json({ message: error.message });
        }
        if (error.message === 'Access denied. Only admins can log in.') {
            return res.status(403).json({ message: error.message });
        }
        if (error.message === 'Account not verified. Please check your email to verify your account.') {
            return res.status(403).json({ message: error.message });
        }

        res.status(500).json({ message: 'Server error' });
    }
};