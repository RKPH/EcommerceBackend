const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products:{
        type: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true
                }
            }
        ],
        required: true
    },
    totalPrice: {
        type: Number,
        required: false
    },
    isPaid: {
        type: Boolean,
        required: true
    },
    createdAt: {
        type: String,
        required: true
    },
    DeliveredAt: {
        type: String,
        required: false
    },
    shippingAddress: {
        type: String,
        required: true
    },
    PaymentMethod: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    history: {
        type: [
            {
                action: {
                    type: String,
                    required: true
                },
                date: {
                    type: String,
                    required: true
                }
            }
        ],
        required: true
    },

});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;