const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    addProduct,
    getAllTypes, // Import the new controller method
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
 *         category:
 *           type: string
 *           description: The category of the product
 *         subcategory:
 *           type: string
 *           description: The subcategory of the product
 *         type:
 *           type: string
 *           description: The type of the product
 *         brand:
 *           type: string
 *           description: The brand of the product
 *         sport:
 *           type: string
 *           description: The sport the product is associated with (optional)
 *         price:
 *           type: number
 *           description: The price of the product
 *         image:
 *           type: string
 *           description: The main image URL of the product
 *         productImage:
 *           type: array
 *           items:
 *             type: string
 *           description: Additional images of the product
 *       required:
 *         - name
 *         - price
 *         - category
 *         - subcategory
 *         - type
 *         - brand
 *         - image
 *         - productImage
 */

/**
 * @swagger
 * /api/v1/products/all:
 *   get:
 *     summary: Retrieve a list of products
 *     security: []
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
 * /api/v1/products/types:
 *   get:
 *     security: []
 *     summary: Retrieve all distinct product types
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of distinct product types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error. Failed to retrieve product types.
 */
router.get('/products/types', getAllTypes); // Add the new route

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Retrieve a single product by ID
 *     security: []
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
 *     security: []
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
 *         description: Invalid product data. Ensure all required fields are valid.
 *       500:
 *         description: Internal server error. Failed to create the product.
 */
router.post('/products/addProduct', addProduct);



module.exports = router;
