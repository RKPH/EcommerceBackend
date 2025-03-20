const userService = require('../Services/userService');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const role = req.query.role || "";

        const result = await userService.getAllUsers(page, limit, search, role);

        return res.status(200).json({
            status: "success",
            data: result.users,
            pagination: result.pagination,
        });
    } catch (error) {

        return res.status(500).json({
            status: "error",
            message: error.message || "Failed to fetch users due to a server error.",
        });
    }
};

// Get user details
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await userService.getUserDetails(id);

        return res.status(200).json({
            status: 'success',
            message: 'User details retrieved successfully.',
            data: user,
        });
    } catch (error) {


        if (error.message === 'User not found.') {
            return res.status(404).json({
                status: 'error',
                message: error.message,
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'An unexpected error occurred while fetching user details.',
        });
    }
};

// Update a user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedUser = await userService.updateUser(id, updateData);

        return res.status(200).json({
            status: 'success',
            message: 'User updated successfully.',
            data: updatedUser,
        });
    } catch (error) {


        if (error.message === 'Name and email are required.') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'Invalid role. Role must be either "customer" or "admin".') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message.includes('Validation error')) {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'User not found.') {
            return res.status(404).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'Email is already in use by another user.') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'An unexpected error occurred while updating the user.',
        });
    }
};

// Create a user
exports.createUser = async (req, res) => {
    try {
        const userData = req.body;

        const newUser = await userService.createUser(userData);

        return res.status(201).json({
            status: 'success',
            message: 'User created successfully.',
            data: newUser,
        });
    } catch (error) {

        if (error.message === 'Name, email, and password are required.') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'Invalid email format.') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'Invalid role. Role must be either "customer" or "admin".') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message.includes('Validation error')) {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        if (error.message === 'Email is already in use by another user.') {
            return res.status(400).json({
                status: 'error',
                message: error.message,
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'An unexpected error occurred while creating the user.',
        });
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {

        const { name, email, avatar } = req.body;
        const userId = req.user.userId;


        const result = await userService.updateUserProfile(userId, { name, email, avatar });


        return res.status(200).json(result);
    } catch (error) {

        if (error.message === 'User not found') {
            return res.status(404).json({
                message: error.message,
            });
        }
        if (error.message === 'Email is already in use') {
            return res.status(400).json({
                message: error.message,
            });
        }
        return res.status(500).json({
            message: error.message || 'Error updating user profile',
        });
    }
};

exports.getUserComparison = async (req, res) => {
    try {
        const { onlyVerified = false } = req.query;
        const userComparisonData = await userService.getUserComparison({ onlyVerified: onlyVerified === 'true' });
        res.status(200).json(userComparisonData);
    } catch (error) {

        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};