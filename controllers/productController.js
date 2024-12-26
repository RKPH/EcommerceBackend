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
    console.log (id);
    try {
        const product = await Product.findOne({ productID: id });

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Product with productID ${id} not found`,
                data: null,
            });
        }

        res.json({
            status: 'success',
            message: `Product with productID ${id} retrieved successfully`,
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
        type,
        brand,
        color,
        size,
        description,
        image,
        productImage,
    } = req.body;

    // Validate the product data
    if (
        !name ||
        !category ||
        !type ||
        !Array.isArray(image) ||
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
            type,
            brand,
            color: color || [],
            size: size || [],
            price,
            description,
            image: image || [],
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

// Controller to get all distinct types
exports.getAllTypes = async (req, res) => {
    try {
        const types = await Product.distinct('type');
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

// Controller to get products by type
exports.getProductByTypes = async (req, res) => {
    const { type } = req.params;

    try {
        const products = await Product.find({ type });
        if (!products || products.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `No products found for type: ${type}`,
            });
        }
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
