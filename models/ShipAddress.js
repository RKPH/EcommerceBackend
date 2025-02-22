const mongoose = require('mongoose');

const shippingAddressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    addresses: [
        {
            street: { type: String, required: true },
            city: { type: String, required: true },
            cityCode: { type: String, required: true },
            district: { type: String, required: true },
            districtCode: {type: String, require: true}, // Added district
            ward: { type: String, required: true },
            wardCode: {type:String, required: true},
            phoneNumber: { type: String, required: true}// Added ward
        }
    ]
}, {
    timestamps: true,
    versionKey: false
});

const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);
module.exports = ShippingAddress;
