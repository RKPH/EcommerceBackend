const express = require('express');
const router = express.Router();
const Product = require('../models/products'); // Import the Product model
const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The product ID (MongoDB ObjectId)
 *         name:
 *           type: string
 *           description: The name of the product
 *         price:
 *           type: number
 *           description: The price of the product
 *         category:
 *            type: string
 *            description: The category of the product
 *       required:
 *         - name
 *         - price
 *         - category
 *
 * /api/v1/products:
 *   get:
 *     summary: Retrieve a list of products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Internal server error. Failed to retrieve products.
 *
 * /api/v1/products/addProduct:
 *   post:
 *     summary: Add a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: The product was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product data. Name and a positive price are required.
 *       500:
 *         description: Internal server error. Failed to create the product.
 *
 * /api/v1/products/{id}:
 *   get:
 *     summary: Retrieve a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: A single product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format.
 *       404:
 *         description: Product not found with the given ID.
 *       500:
 *         description: Internal server error. Failed to retrieve the product.
 */

// GET all products
router.get('/products', async (req, res) => {
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
});

// GET a product by ID
router.get('/:id', async (req, res) => {
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
});

// POST a new product
router.post('/products/addProduct', async (req, res) => {
    const { name, price , category } = req.body;

    // Validate the product data
    if (!name || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid product data. Name and a positive price are required.',
        });
    }

    try {
        const newProduct = new Product({
            name,
            price,
            category,
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
});

module.exports = router;
