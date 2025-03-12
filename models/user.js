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
        avatar: {
            type: String,
            required: false,
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
            type: String,
            unique: true,
            autoIncrement: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationCode: { type: String }, // Store the 12-digit code
        resetToken: { type: String },
        restTokenExpiry: { type: Date },

    }, {
        timestamps: true, // Adds createdAt and updatedAt fields
        versionKey: false, // Disables the versioning (_v field)
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);
    module.exports =  User