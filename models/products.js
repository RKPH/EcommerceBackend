const mongoose = require('mongoose');

// Define the product schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    subcategory: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    sport: {
        type: String,
        required: false,
    },
    price: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    productImage: {
        type: [String],
        required: true,
    },
}, {
    versionKey: false,  // Disable the __v field
});

// Create and export the Product model
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
