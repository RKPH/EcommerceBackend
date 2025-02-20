const User = require('../models/user'); // Assuming your model is in the `models` folder

// Update user profile
const updateUserProfile = async (req, res) => {
    const { name, email, address, avatar } = req.body;
    const userId = req.user. userId; // Assuming the user ID is attached to the request (e.g., from JWT token)

    try {
        console.log("user in update ",req.user);
        // Find the user by their ID
        const user = await User.findById(userId);
        if (!user) {
            console.log("user not found");
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the email is already in use by another user (if it's different)
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already in use' });
            }
        }


        // Update user fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.address = address || user.address;
        user.avatar = avatar || user.avatar;
        // Save the updated user
        await user.save();

        // Return the updated user profile (excluding sensitive data like password)
        const userProfile = {
            name: user.name,
            email: user.email,
            address: user.address,
            avatar: user.avatar,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({ message: 'User profile updated successfully', user: userProfile });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating user profile' });
    }
};

module.exports = {
    updateUserProfile,
};
