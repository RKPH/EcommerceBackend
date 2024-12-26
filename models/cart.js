const mongose = require('mongoose');

const CartSchema = new mongose.Schema({
    user: {
        type: mongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    product: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: false,
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