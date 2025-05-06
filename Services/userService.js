// userService.js
const User = require('../models/user');
const { hash } = require('../utils/hash'); // Import password utility
const { v4: uuidv4 } = require('uuid');


const getUTCMonthRange = (year, month) => {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return { start, end };
};



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
 
        const user = await User.findOne(
            { user_id: userId },
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

        console.log(userId);
        const user = await User.findOne({ user_id: userId });
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
            { user_id: userId },
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

        // Find the next available user_id
        let user_id;
        const userCount = await User.countDocuments();
        let nextId = userCount;

        let isUnique = false;
        
        while (!isUnique) {
            user_id = nextId.toString().padStart(4, '0');
            const existingUser = await User.findOne({ user_id });
            if (!existingUser) {
                isUnique = true;
            } else {
                nextId++;
            }
        }

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

exports.updateUserProfile = async (userId, { name, email, avatar }) => {
    try {
        // Find the user by their ID
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if the email is already in use by another user (if it's different)
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw new Error('Email is already in use');
            }
        }

        // Update user fields
        user.name = name || user.name;
        user.email = email || user.email;

        user.avatar = avatar || user.avatar;

        // Save the updated user
        await user.save();

        // Return the updated user profile (excluding sensitive data like password)
        const userProfile = {
            name: user.name,
            email: user.email,

            avatar: user.avatar,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return {
            message: 'User profile updated successfully',
            user: userProfile,
        };
    } catch (error) {
        throw new Error(error.message || 'Error updating user profile');
    }
};

exports.getUserComparison = async ({ onlyVerified = false } = {}) => {
    try {
        const now = new Date();

        const { start: currentMonthStart, end: currentMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth());
        const { start: previousMonthStart, end: previousMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);

        console.log("Current Month (UTC):", currentMonthStart, "to", currentMonthEnd);
        console.log("Previous Month (UTC):", previousMonthStart, "to", previousMonthEnd);

        // Add isVerified filter if specified
        const query = onlyVerified ? { isVerified: true } : {};

        const currentMonthUsers = await User.find({
            ...query,
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
        });

        const previousMonthUsers = await User.find({
            ...query,
            createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd }
        });

        const currentMonthCustomers = currentMonthUsers.filter(user => user.role === 'customer').length;
        const currentMonthAdmins = currentMonthUsers.filter(user => user.role === 'admin').length;
        const previousMonthCustomers = previousMonthUsers.filter(user => user.role === 'customer').length;
        const previousMonthAdmins = previousMonthUsers.filter(user => user.role === 'admin').length;

        const currentUserCount = currentMonthUsers.length;
        const previousUserCount = previousMonthUsers.length;

        const percentageChange = previousUserCount === 0
            ? (currentUserCount > 0 ? 100 : 0)
            : ((currentUserCount - previousUserCount) / previousUserCount) * 100;

        const customerPercentageChange = previousMonthCustomers === 0
            ? (currentMonthCustomers > 0 ? 100 : 0)
            : ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100;

        const adminPercentageChange = previousMonthAdmins === 0
            ? (currentMonthAdmins > 0 ? 100 : 0)
            : ((currentMonthAdmins - previousMonthAdmins) / previousMonthAdmins) * 100;

        return {
            totalUsers: {
                currentMonth: currentUserCount,
                previousMonth: previousUserCount,
                percentageChange: percentageChange.toFixed(2) + "%"
            },
            customers: {
                currentMonth: currentMonthCustomers,
                previousMonth: previousMonthCustomers,
                percentageChange: customerPercentageChange.toFixed(2) + "%"
            },
            admins: {
                currentMonth: currentMonthAdmins,
                previousMonth: previousMonthAdmins,
                percentageChange: adminPercentageChange.toFixed(2) + "%"
            }
        };
    } catch (error) {
        console.error("Error fetching user comparison:", error);
        throw new Error("Failed to fetch user comparison");
    }
};