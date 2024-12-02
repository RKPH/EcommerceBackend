const mongose = require('mongoose');

const CartSchema = new mongose.Schema({
    user: {
        type: mongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    product: {
        type: mongose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});

const Cart = mongose.model('Cart', CartSchema);

module.exports = Cart;