const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    getAllTypes,
    getProductByTypes,
    getAllCategories,
    getRecommendations,
    sessionBasedRecommendation,
    getTopTrendingProducts,
    searchProducts,
    getProductsByCategories,
    anonymousRecommendation,
    searchProductsPaginated,
    getTypesByCategory,
    getCartRecommendations,
    createProduct,
    importProducts,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const multer = require('multer');

// Middleware to check if the user is an admin (example implementation)
const isAdmin = (req, res, next) => {
    // This is a placeholder; replace with your actual authentication/authorization logic
    const user = req.user; // Assuming req.user is set by an authentication middleware (e.g., JWT)
    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }
    next();
};

// Configure multer for file uploads (for importProducts)
const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The MongoDB ObjectId of the product (auto-generated)
 *         product_id:
 *           type: string
 *           description: The unique identifier for the product
 *         name:
 *           type: string
 *           description: The name of the product
 *         stock:
 *           type: number
 *           description: The stock quantity of the product
 *         rating:
 *           type: number
 *           description: The rating of the product (optional)
 *         brand:
 *           type: string
 *           description: The brand of the product
 *         price:
 *           type: number
 *           description: The price of the product
 *         category:
 *           type: string
 *           description: The category of the product
 *         type:
 *           type: string
 *           description: The type of the product
 *         MainImage:
 *           type: string
 *           description: The URL to the main image of the product
 *         description:
 *           type: string
 *           description: A description of the product (optional)
 *       required:
 *         - product_id
 *         - name
 *         - stock
 *         - brand
 *         - price
 *         - category
 *         - type
 *         - MainImage
 *     SearchProduct:
 *       type: object
 *       allOf:
 *         - $ref: '#/components/schemas/Product'
 *         - type: object
 *           properties:
 *             similarityScore:
 *               type: number
 *               description: The similarity score from vector search
 *             qdrantData:
 *               type: object
 *               description: Additional metadata from Qdrant
 *               properties:
 *                 event_type:
 *                   type: string
 *                 event_time:
 *                   type: string
 *                 user_id:
 *                   type: string
 *                 user_session:
 *                   type: string
 *                 price:
 *                   type: number
 */

 /**
 * @swagger
 * /api/v1/products/search:
 *   get:
 *     summary: Search products using Qdrant vector search
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: The search query to find products
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchProduct'
 *       400:
 *         description: Search query is required
 *       404:
 *         description: No products found for this query
 *       500:
 *         description: Internal server error. Failed to retrieve search results.
 */
router.get("/search", searchProducts);

/**
 * @swagger
 * /api/v1/products/searchFullPage:
 *   get:
 *     summary: Search products with pagination and filters using Qdrant vector search
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: The search query to find products
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of products per page
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by rating
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchProduct'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: Search query is required or invalid pagination parameters
 *       404:
 *         description: No products found for this query
 *       500:
 *         description: Internal server error. Failed to retrieve search results.
 */
router.get("/searchFullPage", searchProductsPaginated);

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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: No types found
 *       500:
 *         description: Internal server error. Failed to retrieve product types.
 */
router.get('/types', getAllTypes);

/**
 * @swagger
 * /api/v1/products/types/category/{category}:
 *   get:
 *     summary: Retrieve product types by category
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *         required: true
 *         description: The product category
 *     responses:
 *       200:
 *         description: A list of product types for the category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Category is required
 *       404:
 *         description: No types found for the given category
 *       500:
 *         description: Internal server error. Failed to retrieve types.
 */
router.get("/types/category/:category", getTypesByCategory);

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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by rating
 *     responses:
 *       200:
 *         description: A list of products by type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: Invalid product type format or pagination parameters
 *       404:
 *         description: No products found for the given type
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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: No categories found
 *       500:
 *         description: Internal server error. Failed to retrieve product categories.
 */
router.get('/categories', getAllCategories);

/**
 * @swagger
 * /api/v1/products/category/{category}:
 *   get:
 *     summary: Retrieve products by category
 *     security: []
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *         required: true
 *         description: The product category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by product type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by rating
 *     responses:
 *       200:
 *         description: A list of products by category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       400:
 *         description: Category is required or invalid pagination parameters
 *       404:
 *         description: No products found for the given category
 *       500:
 *         description: Internal server error. Failed to retrieve products by category.
 */
router.get("/category/:category", getProductsByCategories);

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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       404:
 *         description: No trending products found
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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: The number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter products
 *     responses:
 *       200:
 *         description: A list of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       400:
 *         description: Invalid pagination parameters
 *       404:
 *         description: No products found
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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format
 *       404:
 *         description: Product not found with the given ID
 *       500:
 *         description: Internal server error. Failed to retrieve the product.
 */
router.get('/:id', getProductById);

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
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format
 *       404:
 *         description: No recommendations found for the given product ID
 *       500:
 *         description: Internal server error. Failed to retrieve recommendations.
 */
router.post('/predict/:product_id', getRecommendations);

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
 *               user_id:
 *                 type: string
 *                 description: The user ID for session-based recommendations
 *               product_id:
 *                 type: string
 *                 description: The product ID to base recommendations on
 *             required:
 *               - user_id
 *               - product_id
 *     responses:
 *       200:
 *         description: Session-based recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid request body or missing required fields
 *       404:
 *         description: No recommendations found
 *       500:
 *         description: Internal server error. Failed to retrieve session-based recommendations.
 */
router.post('/recommendations', sessionBasedRecommendation);

/**
 * @swagger
 * /api/v1/products/anonymous_recommendations:
 *   post:
 *     summary: Get product recommendations for anonymous users
 *     security: []
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *                 description: The product ID to base recommendations on
 *             required:
 *               - product_id
 *     responses:
 *       200:
 *         description: Anonymous recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid product ID format
 *       404:
 *         description: No recommendations found
 *       500:
 *         description: Internal server error. Failed to retrieve recommendations.
 */
router.post('/anonymous_recommendations', anonymousRecommendation);


/**
 * @swagger
 * /api/v1/products/cart-recommendations:
 *   post:
 *     summary: Get cart-based product recommendations
 *     security: []
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cart_items:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: The list of product IDs in the cart
 *               k:
 *                 type: integer
 *                 description: The number of recommendations to return (default 5)
 *             required:
 *               - cart_items
 *     responses:
 *       200:
 *         description: Cart-based recommendations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart_items:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product_id:
 *                             type: string
 *                           productDetails:
 *                             $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid request body or missing required fields
 *       404:
 *         description: No recommendations found for the given cart items
 *       500:
 *         description: Internal server error. Failed to retrieve cart-based recommendations.
 */
router.post('/cart-recommendations', getCartRecommendations);


module.exports = router;