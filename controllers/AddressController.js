const ShippingAddress = require('../models/ShipAddress');

// ✅ Add a new address to the user's address array
exports.addShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { street, city, cityCode, district, districtCode, ward, wardCode, phoneNumber } = req.body;

        console.log("req", req.body);

        // Ensure all fields are present in the request
        if (!street || !city || !cityCode || !district || !districtCode || !ward || !wardCode || !phoneNumber) {
            return res.status(400).json({ message: "All address fields are required" });
        }

        // Find or create the shipping address document
        let shippingAddress = await ShippingAddress.findOne({ user: userId });

        if (!shippingAddress) {
            // Create a new shipping address if it doesn't exist
            shippingAddress = new ShippingAddress({
                user: userId,
                addresses: [{
                    street,
                    city,
                    cityCode,
                    district,
                    districtCode,
                    ward,
                    wardCode,
                    phoneNumber
                }]
            });
        } else {
            // Add the new address if it already exists
            shippingAddress.addresses.push({
                street,
                city,
                cityCode,
                district,
                districtCode,
                ward,
                wardCode,
                phoneNumber
            });
        }

        // Save the updated shipping address
        await shippingAddress.save();

        res.status(201).json({ message: "Shipping address added successfully", shippingAddress });
    } catch (error) {
        console.error("Error adding shipping address:", error);

        // Check for validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message, errors: error.errors });
        }

        res.status(500).json({ message: "Server error" });
    }
};


// ✅ Get all shipping addresses of the logged-in user
exports.getShippingAddresses = async (req, res) => {
    try {
        const { userId } = req.user;
        const shippingAddress = await ShippingAddress.findOne({ user: userId });

        if (!shippingAddress) {
            return res.status(404).json({ message: "No shipping addresses found" });
        }

        res.status(200).json({ addresses: shippingAddress.addresses });
    } catch (error) {
        console.error("Error fetching shipping addresses:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// ✅ Update a specific address in the user's address array
exports.updateShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;  // Extract userId from the authenticated user
        const { addressId, street, city, cityCode, district, districtCode, ward, wardCode, phoneNumber } = req.body;

        console.log("req", req.body);

        // Find the user's shipping address by userId
        const shippingAddress = await ShippingAddress.findOne({ user: userId });

        if (!shippingAddress) {
            return res.status(404).json({ message: "No shipping addresses found for this user." });
        }

        // Find the specific address by addressId in the addresses array
        const addressIndex = shippingAddress.addresses.findIndex((address) => address._id.toString() === addressId);

        if (addressIndex === -1) {
            console.log("not found");
            return res.status(404).json({ message: "Address not found." });
        }

        // Update the address fields with the data from the request
        shippingAddress.addresses[addressIndex].street = street || shippingAddress.addresses[addressIndex].street;
        shippingAddress.addresses[addressIndex].city = city || shippingAddress.addresses[addressIndex].city;
        shippingAddress.addresses[addressIndex].cityCode = cityCode || shippingAddress.addresses[addressIndex].cityCode;
        shippingAddress.addresses[addressIndex].district = district || shippingAddress.addresses[addressIndex].district;
        shippingAddress.addresses[addressIndex].districtCode = districtCode || shippingAddress.addresses[addressIndex].districtCode;
        shippingAddress.addresses[addressIndex].ward = ward || shippingAddress.addresses[addressIndex].ward;
        shippingAddress.addresses[addressIndex].wardCode = wardCode || shippingAddress.addresses[addressIndex].wardCode;
        shippingAddress.addresses[addressIndex].phoneNumber = phoneNumber || shippingAddress.addresses[addressIndex].phoneNumber;

        // Save the updated shipping address
        await shippingAddress.save();

        // Return the updated address only
        res.status(200).json({
            message: "Shipping address updated successfully.",
            updatedAddress: shippingAddress.addresses[addressIndex]
        });
    } catch (error) {
        console.error("Error updating shipping address:", error);
        res.status(500).json({ message: "Server error while updating address." });
    }
};

// ✅ Delete a specific address from the user's address array
exports.deleteShippingAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { addressId } = req.params;

        const shippingAddress = await ShippingAddress.findOne({ user: userId });

        if (!shippingAddress) {
            return res.status(404).json({ message: "No shipping addresses found" });
        }

        shippingAddress.addresses = shippingAddress.addresses.filter(addr => addr._id.toString() !== addressId);

        await shippingAddress.save();
        res.status(200).json({ message: "Shipping address deleted successfully", shippingAddress });
    } catch (error) {
        console.error("Error deleting shipping address:", error);
        res.status(500).json({ message: "Server error" });
    }
};
