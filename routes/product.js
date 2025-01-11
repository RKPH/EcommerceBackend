const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    getAllTypes,
    getProductByTypes,
    getAllCategories,
    addProduct, getRecommendations, sessionBasedRecommendation, getTopTrendingProducts
} = require('../controllers/productController');

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
 *         type:
 *           type: string
 *           description: The type of the product
 *         brand:
 *            type: string
 *            description: The brand of the product
 *         color:
 *           type: array
 *           items:
 *             type: string
 *           description: An array of colors for the product
 *         size:
 *           type: array
 *           items:
 *             type: string
 *           description: An array of sizes for the product
 *         description:
 *             type: string
 *             description: A description of the product
 *         image:
 *           type: array
 *           items:
 *             type: string
 *           description: A URL to the product's image
 *         productImage:
 *           type: array
 *           items:
 *             type: string
 *           description: An array of URLs to detailed product images
 *       required:
 *         - name
 *         - price
 *         - category
 *         - brand
 *         - type
 *         - color
 *         - description
 *         - size
 *         - image
 *         - productImage
 */


/**
 * @swagger
 * /api/v1/products/types:
 *   get:
 *     summary: Retrieve all product types
 *     security: []
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of product types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error. Failed to retrieve product types.
 */
router.get('/types', getAllTypes);

/**
 * @swagger
 * /api/v1/products/type/{type}:
 *   get:
 *     summary: Retrieve products by type
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: The product type
 *     responses:
 *       200:
 *         description: A list of products by type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product type format.
 *       404:
 *         description: No products found for the given type.
 *       500:
 *         description: Internal server error. Failed to retrieve products by type.
 */
router.get('/type/:type', getProductByTypes);

/**
 * @swagger
 * /api/v1/products/categories:
 *   get:
 *     summary: Retrieve all product categories
 *     security: []
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of product categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Internal server error. Failed to retrieve product categories.
 */
router.get('/categories', getAllCategories);


/**
 * @swagger
 * /api/v1/products/trending:
 *   get:
 *     summary: Retrieve the top 10 trending products
 *     security: []
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of the top 10 trending products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Internal server error. Failed to retrieve trending products.
 */
router.get('/trending', getTopTrendingProducts);

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
router.get('/all', getAllProducts);

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
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/v1/products/add:
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
 *         description: Product added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid request body. Missing required fields.
 *       500:
 *         description: Internal server error. Failed to add the product.
 */
router.post('/add', addProduct);

/**
 * @swagger
 * /api/v1/products/predict/{product_id}:
 *   post:
 *     summary: Get product recommendations based on a specific product
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: product_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID for which recommendations are generated
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format.
 *       404:
 *         description: No recommendations found for the given product ID.
 *       500:
 *         description: Internal server error. Failed to retrieve recommendations.
 */
router.post('/predict/:product_id', getRecommendations)


/**
 * @swagger
 * /api/v1/products/recommendations:
 *   post:
 *     summary: Get session-based product recommendations
 *     security: []
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionData:
 *                 type: object
 *                 description: Session data used to generate recommendations
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: Session-based recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid request body or session data format.
 *       500:
 *         description: Internal server error. Failed to retrieve session-based recommendations.
 */
router.post('/recommendations', sessionBasedRecommendation)

module.exports = router;
