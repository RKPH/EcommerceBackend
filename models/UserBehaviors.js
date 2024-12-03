const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
    sessionId: {
        type: String, // sessionId as key
        required: true,
    },
    SessionActionId: {
        type: String,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    behavior: {
        type: String,
        enum: ['view', 'like', 'dislike', 'cart', 'purchase'],
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

// Create model from schema
const UserBehavior = mongoose.model('UserBehavior', userBehaviorSchema);

module.exports = UserBehavior;
