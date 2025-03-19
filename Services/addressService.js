const ShippingAddress = require('../models/ShipAddress');

// Add a new shipping address
exports.addShippingAddress = async (userId, addressData) => {
    const { street, city, cityCode, district, districtCode, ward, wardCode, phoneNumber } = addressData;

    if (!street || !city || !cityCode || !district || !districtCode || !ward || !wardCode || !phoneNumber) {
        throw new Error('All address fields are required');
    }

    let shippingAddress = await ShippingAddress.findOne({ user: userId });

    if (!shippingAddress) {
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

    await shippingAddress.save();
    return shippingAddress;
};

// Get all shipping addresses
exports.getShippingAddresses = async (userId) => {
    const shippingAddress = await ShippingAddress.findOne({ user: userId });
    if (!shippingAddress) {
        throw new Error('No shipping addresses found');
    }
    return shippingAddress.addresses;
};

// Update a specific shipping address
exports.updateShippingAddress = async (userId, addressId, addressData) => {
    const { street, city, cityCode, district, districtCode, ward, wardCode, phoneNumber } = addressData;

    const shippingAddress = await ShippingAddress.findOne({ user: userId });
    if (!shippingAddress) {
        throw new Error('No shipping addresses found for this user');
    }

    const addressIndex = shippingAddress.addresses.findIndex((address) => address._id.toString() === addressId);
    if (addressIndex === -1) {
        throw new Error('Address not found');
    }

    shippingAddress.addresses[addressIndex].street = street || shippingAddress.addresses[addressIndex].street;
    shippingAddress.addresses[addressIndex].city = city || shippingAddress.addresses[addressIndex].city;
    shippingAddress.addresses[addressIndex].cityCode = cityCode || shippingAddress.addresses[addressIndex].cityCode;
    shippingAddress.addresses[addressIndex].district = district || shippingAddress.addresses[addressIndex].district;
    shippingAddress.addresses[addressIndex].districtCode = districtCode || shippingAddress.addresses[addressIndex].districtCode;
    shippingAddress.addresses[addressIndex].ward = ward || shippingAddress.addresses[addressIndex].ward;
    shippingAddress.addresses[addressIndex].wardCode = wardCode || shippingAddress.addresses[addressIndex].wardCode;
    shippingAddress.addresses[addressIndex].phoneNumber = phoneNumber || shippingAddress.addresses[addressIndex].phoneNumber;

    await shippingAddress.save();
    return shippingAddress.addresses[addressIndex];
};

// Delete a specific shipping address
exports.deleteShippingAddress = async (userId, addressId) => {
    const shippingAddress = await ShippingAddress.findOne({ user: userId });
    if (!shippingAddress) {
        throw new Error('No shipping addresses found');
    }

    const initialLength = shippingAddress.addresses.length;
    shippingAddress.addresses = shippingAddress.addresses.filter(addr => addr._id.toString() !== addressId);

    if (shippingAddress.addresses.length === initialLength) {
        throw new Error('Address not found');
    }

    await shippingAddress.save();
    return shippingAddress;
};

