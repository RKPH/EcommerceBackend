const mongoose = require('mongoose');

// Define the product schema
const productSchema = new mongoose.Schema({
    productID: {
        type: String,
        unique: true,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    color: {
        type: [String],
        required: false,
    },
    size: {
        type: [String],
        required: false,
    },
    price: {
        type: Number,
        required: true,
    },
    image: {
        type: [String],
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    productImage: {
        type: [String],
        required: true,
    },
    trending_score: {
        type: Number,
        default: 0,
    }
}, {
    versionKey: false,  // Disable the __v field
});

// Create and export the Product model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
