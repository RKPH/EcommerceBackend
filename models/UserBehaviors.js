const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
    sessionId: {
        type: String, // sessionId as key
        required: true,
    },
    user_id: {
       type:String,
       required: true,
    },
    product_id: {
        type: String,
        required: true,
    },
    product_name : {
        type: String,
        required: true,
    },
    behavior: {
        type: String,
        enum: ['view', 'like', 'dislike','checkout' ,'cart', 'purchase'],
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

// Create model from schema
const UserBehavior = mongoose.model('UserBehavior', userBehaviorSchema);

module.exports = UserBehavior;
