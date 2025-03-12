const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderID: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },  // Track which order this review is for
    product_id: { type: Number, },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", ReviewSchema);
