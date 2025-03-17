// userService.js
const User = require('../models/user');
const { hash, verifyPassword } = require('../utils/hash'); // Import password utility
const { generateJwt, generateRefreshToken } = require('../utils/jwt'); // Import JWT generation utility
const { v4: uuidv4 } = require('uuid');

exports.getAllUsers = async (page = 1, limit = 10, search = "", role = "") => {
    try {
        const query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ],
        };

        if (role) {
            query.role = role;
        }

        const totalItems = await User.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        const users = await User.find(query)
            .select("name avatar user_id role createdAt email") // Exclude sensitive fields like password
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .lean();

        return {
            users,
            pagination: {
                totalItems,
                totalPages,
                currentPage: page,
                itemsPerPage: limit,
            },
        };
    } catch (error) {
        throw new Error(error.message || 'An unexpected error occurred while fetching users.');
    }
};

exports.getUserDetails = async (userId) => {
    try {
        const id = parseInt(userId.trim(), 10);
        const user = await User.findOne(
            { user_id: id },
            { password: 0, salt: 0, verificationCode: 0, resetToken: 0, restTokenExpiry: 0, __v: 0 }
        );

        if (!user) {
            throw new Error('User not found.');
        }

        return {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || null,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    } catch (error) {
        throw new Error(error.message || 'An unexpected error occurred while fetching user details.');
    }
};

exports.updateUser = async (userId, updateData) => {
    try {
        const { name, email, avatar, password, emailVerified, role } = updateData;

        // Validate required fields
        if (!name || !email) {
            throw new Error('Name and email are required.');
        }

        // Validate role
        if (role && !['customer', 'admin'].includes(role)) {
            throw new Error('Invalid role. Role must be either "customer" or "admin".');
        }

        const id = parseInt(userId.trim(), 10);
        const user = await User.findOne({ user_id: id });
        if (!user) {
            throw new Error('User not found.');
        }

        // Check if email is being updated and ensure it's unique
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                throw new Error('Email is already in use by another user.');
            }
        }

        // Prepare the update object
        const updateObj = {
            name,
            email,
            avatar: avatar || user.avatar,
            isVerified: emailVerified !== undefined ? emailVerified : user.isVerified,
            role: role || user.role,
        };

        // If password is provided, hash it and update salt and password
        if (password) {
            const { salt, hashedPassword } = hash(password);
            updateObj.salt = salt;
            updateObj.password = hashedPassword;
        }

        const updatedUser = await User.findOneAndUpdate(
            { user_id: id },
            { $set: updateObj },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            throw new Error('Failed to update user.');
        }

        return {
            user_id: updatedUser.user_id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            isVerified: updatedUser.isVerified,
        };
    } catch (error) {
        if (error.name === 'ValidationError') {
            throw new Error(`Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`);
        }
        if (error.code === 11000 && error.keyPattern?.email) {
            throw new Error('Email is already in use by another user.');
        }
        throw new Error(error.message || 'An unexpected error occurred while updating the user.');
    }
};

exports.createUser = async (userData) => {
    try {
        const { name, email, avatar, password, emailVerified, role } = userData;

        // Validate required fields
        if (!name || !email || !password) {
            throw new Error('Name, email, and password are required.');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format.');
        }

        // Validate role
        if (role && !['customer', 'admin'].includes(role)) {
            throw new Error('Invalid role. Role must be either "customer" or "admin".');
        }

        // Check if email already exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            throw new Error('Email is already in use by another user.');
        }

        // Generate a unique user_id
        let user_id;
        let isUnique = false;
        do {
            user_id = Math.floor(100000000 + Math.random() * 900000000); // Generate a 9-digit number
            const existingUser = await User.findOne({ user_id });
            if (!existingUser) {
                isUnique = true;
            }
        } while (!isUnique);

        // Hash the password
        const { salt, hashedPassword } = hash(password);

        // Prepare the new user data
        const newUserData = {
            user_id,
            name,
            email,
            avatar: avatar || '',
            password: hashedPassword,
            salt,
            role: role || 'customer',
            isVerified: emailVerified !== undefined ? emailVerified : false,
        };

        // Create the new user
        const newUser = new User(newUserData);
        const savedUser = await newUser.save();

        if (!savedUser) {
            throw new Error('Failed to create user.');
        }

        return {
            user_id: savedUser.user_id,
            name: savedUser.name,
            email: savedUser.email,
            avatar: savedUser.avatar,
            role: savedUser.role,
            isVerified: savedUser.isVerified,
            createdAt: savedUser.createdAt,
        };
    } catch (error) {
        if (error.name === 'ValidationError') {
            throw new Error(`Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`);
        }
        if (error.code === 11000 && error.keyPattern?.email) {
            throw new Error('Email is already in use by another user.');
        }
        throw new Error(error.message || 'An unexpected error occurred while creating the user.');
    }
};

exports.loginAdmin = async (email, password) => {
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
        throw new Error(error.message || 'An unexpected error occurred during admin login.');
    }
};