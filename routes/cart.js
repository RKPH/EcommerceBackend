const expressJs = require('express');
const router = expressJs.Router();
const { addProductToCart, getCartItems, updateCartItem, removeCartItem } = require('../controllers/cartController');
const verifyToken = require('../middlewares/verifyToken');

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
 *           example: "prod123"
 *         product_id:
 *           type: string
 *           description: The unique identifier for the product
 *           example: "P12345"
 *         name:
 *           type: string
 *           description: The name of the product
 *           example: "Product Name"
 *         stock:
 *           type: number
 *           description: The stock quantity of the product
 *           example: 100
 *         rating:
 *           type: number
 *           description: The rating of the product (optional)
 *           example: 4.5
 *         brand:
 *           type: string
 *           description: The brand of the product
 *           example: "BrandX"
 *         price:
 *           type: number
 *           description: The price of the product
 *           example: 29.99
 *         category:
 *           type: string
 *           description: The category of the product
 *           example: "Electronics"
 *         type:
 *           type: string
 *           description: The type of the product
 *           example: "Gadget"
 *         MainImage:
 *           type: string
 *           description: The URL to the main image of the product
 *           example: "https://example.com/images/product.jpg"
 *         description:
 *           type: string
 *           description: A description of the product (optional)
 *           example: "A high-quality product"
 *       required:
 *         - product_id
 *         - name
 *         - stock
 *         - brand
 *         - price
 *         - category
 *         - type
 *         - MainImage
 *     Cart:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The MongoDB ObjectId of the cart item (auto-generated)
 *           example: "cart123"
 *         user:
 *           type: string
 *           description: The MongoDB ObjectId of the user who owns the cart (references the User model)
 *           example: "user123"
 *         productID:
 *           type: string
 *           description: The unique identifier for the product in the cart (matches Product.product_id)
 *           example: "P12345"
 *         product:
 *           $ref: '#/components/schemas/Product'
 *           description: The product details (populated from the Product model, optional)
 *         quantity:
 *           type: number
 *           description: The quantity of the product in the cart
 *           example: 2
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the cart item was created
 *           example: "2025-03-26T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the cart item was last updated
 *           example: "2025-03-26T10:00:00.000Z"
 *       required:
 *         - user
 *         - productID
 *         - quantity
 */

// Cart Routes (Authenticated Users)
/**
 * @swagger
 * /api/v1/cart/add:
 *   post:
 *     summary: Add a product to the cart (Authenticated User)
 *     description: Adds a product to the authenticated user's cart. Requires a valid JWT token.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productID
 *               - quantity
 *             properties:
 *               productID:
 *                 type: string
 *                 description: The unique identifier for the product (matches Product.product_id)
 *                 example: "P12345"
 *               quantity:
 *                 type: number
 *                 description: The quantity of the product to add
 *                 example: 2
 *     responses:
 *       200:
 *         description: Product added to cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Product added to cart
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: productID and quantity are required
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.post('/add', verifyToken, addProductToCart);

/**
 * @swagger
 * /api/v1/cart/get:
 *   get:
 *     summary: Get all items in the cart (Authenticated User)
 *     description: Retrieves all items in the authenticated user's cart, including populated product details if available. Requires a valid JWT token.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cart'
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.get('/get', verifyToken, getCartItems);

/**
 * @swagger
 * /api/v1/cart/update:
 *   put:
 *     summary: Update a cart item (Authenticated User)
 *     description: Updates the quantity of a specific product in the authenticated user's cart. Requires a valid JWT token.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productID
 *               - quantity
 *             properties:
 *               productID:
 *                 type: string
 *                 description: The unique identifier for the product (matches Product.product_id)
 *                 example: "P12345"
 *               quantity:
 *                 type: number
 *                 description: The new quantity of the product
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cart item updated
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Bad request (e.g., missing required fields)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: productID and quantity are required
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       404:
 *         description: Cart item not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Cart item not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.put('/update', verifyToken, updateCartItem);

/**
 * @swagger
 * /api/v1/cart/delete:
 *   delete:
 *     summary: Remove a product from the cart (Authenticated User)
 *     description: Removes a specific product from the authenticated user's cart. Requires a valid JWT token.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productID
 *             properties:
 *               productID:
 *                 type: string
 *                 description: The unique identifier for the product (matches Product.product_id)
 *                 example: "P12345"
 *     responses:
 *       200:
 *         description: Product removed from cart successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Product removed from cart
 *       400:
 *         description: Bad request (e.g., missing productID)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: productID is required
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       404:
 *         description: Cart item not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Cart item not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.delete('/delete', verifyToken, removeCartItem);

module.exports = router;