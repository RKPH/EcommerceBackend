const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
    user_session: {
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
    name : {
        type: String,
        required: true,
    },
    event_type: {
        type: String,
        enum: ['view', 'like', 'dislike','checkout' ,'cart', 'purchase'],
        required: true,
    },
    event_time:{
        type: Date,
        required: true,
    },

}, {
    timestamps: false,
    versionKey: false,
});

// Create model from schema
const UserBehavior = mongoose.model('UserBehavior', userBehaviorSchema);

module.exports = UserBehavior;
