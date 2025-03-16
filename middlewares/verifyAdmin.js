// middleware/verifyAdmin.js
const User = require('../models/user'); // Adjust the path to your User model

const verifyAdmin = async (req, res, next) => {
    try {
        // Check if req.user exists (should be set by verifyToken)
        if (!req.user || !req.user.userId) {
            console.log("No user data or userId found in request. req.user:", req.user);
            return res.status(401).json({ message: 'Invalid authentication data' });
        }

        // Fetch the user from the database using the userId from the token
        const user = await User.findById(req.user.userId).select('role');
        if (!user) {
            console.log("User not found for userId:", req.user.userId);
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is an admin
        if (user.role !== 'admin') {
            console.log("Access denied: User is not an admin. Role:", user.role);
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Attach the user object to the request for potential use in the controller
        req.adminUser = user; // Use a different property to avoid overwriting req.user
        console.log("Admin verified. Proceeding to next middleware. userId:", req.user.userId);
        next();
    } catch (error) {
        console.error('Error verifying admin access:', error);
        return res.status(500).json({ message: 'Server error while verifying admin' });
    }
};

module.exports = verifyAdmin;