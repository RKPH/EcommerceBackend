    const mongoose = require('mongoose');

    const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // Ensure email is unique
            match: [/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/, 'Please fill a valid email address'], // Regex for email validation
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['customer', 'admin'], // Restrict roles to customer and admin
            default: 'customer',
        },
        salt: {
            type: String
        },
        user_id: {
            type: Number,
            unique: true,
            autoIncrement: true,
        },
        address: {
            street: { type: String, required: false },
            city: { type: String, required: false },
            state: { type: String, required: false },
            postalCode: { type: String, required: false },
            country: { type: String, required: false },
        },
    }, {
        timestamps: true, // Adds createdAt and updatedAt fields
        versionKey: false, // Disables the versioning (_v field)
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    module.exports =  User