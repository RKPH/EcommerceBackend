const shippingAddressService = require('../Services/addressService');

// Add a new shipping address
exports.addShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const addressData = req.body;



        const shippingAddress = await shippingAddressService.addShippingAddress(userId, addressData);

        return res.status(201).json({ message: "Shipping address added successfully", shippingAddress });
    } catch (error) {


        if (error.message === 'All address fields are required') {
            return res.status(400).json({ message: error.message });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }
        return res.status(500).json({ message: "Server error" });
    }
};

// Get all shipping addresses
exports.getShippingAddresses = async (req, res) => {
    try {
        const { userId } = req.user;

        const addresses = await shippingAddressService.getShippingAddresses(userId);

        return res.status(200).json({ addresses });
    } catch (error) {
        console.error("Error fetching shipping addresses:", error.message);

        if (error.message === 'No shipping addresses found') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server error" });
    }
};

// Update a specific shipping address
exports.updateShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { addressId, ...addressData } = req.body;



        const updatedAddress = await shippingAddressService.updateShippingAddress(userId, addressId, addressData);

        return res.status(200).json({ message: "Shipping address updated successfully", updatedAddress });
    } catch (error) {


        if (error.message === 'No shipping addresses found for this user') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'Address not found') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server error while updating address" });
    }
};

// Delete a specific shipping address
exports.deleteShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { addressId } = req.params;

        const shippingAddress = await shippingAddressService.deleteShippingAddress(userId, addressId);

        return res.status(200).json({ message: "Shipping address deleted successfully", shippingAddress });
    } catch (error) {


        if (error.message === 'No shipping addresses found' || error.message === 'Address not found') {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: "Server error" });
    }
};

