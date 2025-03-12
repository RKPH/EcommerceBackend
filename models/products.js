const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_id: {  // Changed from productID to product_id
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        required: false,
    },
    brand: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    MainImage: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
}, {
    versionKey: false,  // Disable the __v field
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;