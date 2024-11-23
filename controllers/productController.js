const Product = require('../models/products');
const mongoose = require('mongoose');

// Controller to get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: products,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to get a product by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;

    // Check if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid product ID format',
        });
    }

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Product with ID ${id} not found`,
                data: null,
            });
        }
        res.json({
            status: 'success',
            message: `Product with ID ${id} retrieved successfully`,
            data: product,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to create a new product
exports.addProduct = async (req, res) => {
    const {
        name,
        price,
        category,
        subcategory,
        type,
        brand,
        sport,
        image,
        productImage,
    } = req.body;

    // Validate the product data
    if (
        !name ||
        !category ||
        !subcategory ||
        !type ||
        !brand ||
        !image ||
        !productImage ||
        !Array.isArray(productImage) ||
        productImage.length === 0 ||
        typeof price !== 'number' ||
        price <= 0
    ) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid product data. Please ensure all required fields are provided and valid.',
        });
    }

    try {
        const newProduct = new Product({
            name,
            category,
            subcategory,
            type,
            brand,
            sport: sport || null, // Optional field with a default value
            price,
            image,
            productImage,
        });

        await newProduct.save();

        res.status(201).json({
            status: 'success',
            message: 'Product added successfully',
            data: newProduct,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.getAllTypes = async (req, res) => {
    try {
        const types = await Product.distinct('type');
        console.log(types);
        res.json({
            status: 'success',
            message: 'Types retrieved successfully',
            data: types,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};
