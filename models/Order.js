const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: { type: Number, required: true }
    }],
    totalPrice: { type: Number },
    createdAt: { type: Date, required: true },
    DeliveredAt: { type: Date },
    shippingAddress: { type: String, required: true },
    PaymentMethod: { type: String, required: true },
    status: {
        type: String,
        enum: ['Draft', 'Pending', 'Confirmed', 'Delivered', 'Cancelled'],
        default: 'Draft'
    },
    payingStatus: {
        type: String,
        enum: ['Paid', 'Unpaid', 'Failed'],
        default: 'Unpaid'
    },
    cancellationReason: {
        type: String,
        default: null
    },
    history: [{
        action: { type: String, required: true },
        date: { type: String, required: true }
    }],

    // New fields for refund tracking
    refundStatus: {    // Tracks refund process
        type: String,
        enum: ['NotInitiated', 'Pending', 'Processing', 'Completed', 'Failed'],
        default: 'NotInitiated'
    },
    refundInfo: {   // Optional - stores bank details if needed
        accountName: { type: String },
        bankName: { type: String },
        accountNumber: { type: String }
    }
});

const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;
