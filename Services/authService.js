const User = require('../models/user');
const Cart = require('../models/cart');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { hash, verifyPassword } = require('../utils/hash');
const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');
const { sendVerificationEmail, sendResetPasswordEmail } = require("../Services/Email");

// Service to register a new user
exports.registerUser = async ({ name, email, password }) => {
    try {
        // Check if the user already exists
        let user = await User.findOne({ email });
        if (user) {
            throw new Error('User already exists');
        }

        // Generate a unique user_id
        let user_id;
        let isUnique = false;
        const userCount = await User.countDocuments();

        while (!isUnique) {
           
            user_id = (userCount + 1).toString().padStart(4, '0');
            const existingUser = await User.findOne({ user_id });
            if (!existingUser) {
                isUnique = true;
            }
        }
       
        // Hash the password and generate the salt
        const { salt, hashedPassword } = await hash(password);

        // Create the new user object
        user = new User({
            name,
            email,
            user_id,
            password: hashedPassword,
            salt,
            isVerified: false,
            verificationCode: crypto.randomInt(100000, 999999),
        });

        // Send the verification email
        const emailSent = await sendVerificationEmail(user.email, user.verificationCode);
        if (!emailSent) {
            throw new Error("Invalid email address or failed to send verification email");
        }

        // Save the user to the database
        await user.save();

        // Generate tokens
        const sessionID = uuidv4();
        const token = generateJwt(user._id, sessionID);
        const refreshToken = generateRefreshToken(user._id, sessionID);

        return {
            token,
            refreshToken,
            user: {
                id: user._id,
                user_id: user.user_id,
                sessionID,
                avatar: user.avatar,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to login a user
exports.loginUser = async ({ email, password }) => {
    try {
        // Validate required fields
        if (!email || !password) {
            throw new Error('All fields are required');
        }

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        if (!user.isVerified) {
            throw new Error('Account not verified. Please check your email to verify your account.');
        }

        // Verify the password
        const isPasswordValid = verifyPassword(user.salt, user.password, password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate tokens
        const sessionID = uuidv4();
        const token = generateJwt(user._id, sessionID);
        const refreshToken = generateRefreshToken(user._id, sessionID);

        return {
            token,
            refreshToken,
            user: {
                id: user._id,
                sessionID,
                user_id: user.user_id,
                avatar: user.avatar,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to verify a user
exports.verifyUser = async ({ userId, verificationCode }) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Check if the code matches
        if (user.verificationCode !== verificationCode) {
            throw new Error("Invalid verification code");
        }

        const sessionID = uuidv4();
        // Mark user as verified
        user.isVerified = true;
        user.verificationCode = null;
        await user.save();

        return {
            user: {
                id: user._id,
                user_id: user.user_id,
                sessionID,
                avatar: user.avatar,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to handle forgot password
exports.forgotPassword = async ({ email }) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error("User not found");
        }

        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
        await user.save();

        const resetLink = `https://d2f.io.vn/reset-password/${resetToken}`;
        await sendResetPasswordEmail(user.email, resetLink);

        return { message: "Password reset email sent!" };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to reset password
exports.resetPassword = async ({ token, password }) => {
    try {
        const user = await User.findOne({ resetToken: token });
        if (!user || user.resetTokenExpiry < Date.now()) {
            throw new Error("Invalid or expired token");
        }

        const { salt, hashedPassword } = await hash(password);
        user.password = hashedPassword;
        user.salt = salt;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        return { message: "Password reset successful" };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to get user profile
exports.getUserProfile = async ({ userId, sessionID }) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const cart = await Cart.countDocuments({ user: user._id });
        return {
            user: {
                id: user._id,
                sessionID,
                name: user.name,
                avatar: user.avatar,
                user_id: user.user_id,
                email: user.email,
                Cart: cart,
                role: user.role,
            },
        };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

// Service to refresh access token
exports.refreshAccessToken = async ({ userId, sessionID }) => {
    try {
        const accessToken = generateJwt(userId.toString(), sessionID.toString());
        const newRefreshToken = generateRefreshToken(userId.toString(), sessionID.toString());

        return { accessToken, newRefreshToken };
    } catch (error) {
        throw new Error(error.message || 'Server error');
    }
};

//login as admin

exports.loginAdminService = async (email, password) => {
    try {
        // Check if the user exists
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if the user is an admin
        if (user.role !== 'admin') {
            throw new Error('Access denied. Only admins can log in.');
        }

        // Check if the account is verified
        if (!user.isVerified) {
            throw new Error('Account not verified. Please check your email to verify your account.');
        }

        // Verify the password
        const isPasswordValid = verifyPassword(user.salt, user.password, password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate a JWT token
        const sessionID = uuidv4();
        const token = generateJwt(user._id, sessionID);
        const refreshToken = generateRefreshToken(user._id, sessionID);

        // Return the user data and tokens
        return {
            token,
            refreshToken,
            sessionID,
            user: {
                id: user._id,
                sessionID: sessionID,
                user_id: user.user_id,
                avatar: user.avatar,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    } catch (error) {
        throw new Error(error.message); // Re-throw the error to be handled by the controller
    }
};