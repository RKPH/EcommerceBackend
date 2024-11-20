const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    addProduct,
} = require('../controllers/productController'); // Import controller methods

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
 *           type: string
 *           description: The category of the product
 *         image:
 *           type: string
 *           description: The image of the product.
 *       required:
 *         - name
 *         - price
 *         - category
 *         - image
 */

/**
 * @swagger
 * /api/v1/products/all:
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
 */
router.get('/products/all', getAllProducts);

/**
 * @swagger
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
router.get('/products/:id', getProductById);

/**
 * @swagger
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
 */
router.post('/products/addProduct', addProduct);

module.exports = router;
