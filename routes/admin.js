const express = require("express");
const { getAllProducts, createProduct, deleteProduct, importProducts, updateProduct } = require("../controllers/productController");
const { getAllUsers, getUserDetails, updateUser, createUser, getUserComparison } = require("../controllers/UserController");
const { getAllOrders, getOrderDetailsForAdmin, updatePaymentStatus,getOrdersWithRefundRequests ,updateRefundStatus, updateOrderStatus, getMonthlyRevenue, getWeeklyRevenue, getRevenueComparison, getOrderComparison, getTopRatedProducts, getTopOrderedProductsController } = require("../controllers/OrderController");
const { loginAdmin } = require("../controllers/authController");
const verifyToken = require('../middlewares/verifyToken');
const verifyAdmin = require('../middlewares/verifyAdmin');

const multer = require('multer');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const dir = 'uploads/';
        try {
            await fs.promises.mkdir(dir, { recursive: true }); // Create directory if it doesn't exist
            cb(null, dir);
        } catch (err) {
            console.error('Error creating directory:', err);
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Revenue Routes (Admin Only)
/**
 * @swagger
 * /api/v1/admin/revenue:
 *   get:
 *     summary: Get monthly revenue (Admin Only)
 *     description: Retrieves the total revenue for the current month, considering only paid orders. Accessible only to admin users.
 *     tags: [Admin - Revenue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly revenue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       example: 15000.50
 *                     month:
 *                       type: string
 *                       example: "2025-03"
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/revenue", verifyToken, verifyAdmin, getMonthlyRevenue);

/**
 * @swagger
 * /api/v1/admin/WeeklyRevenue:
 *   get:
 *     summary: Get weekly revenue (Admin Only)
 *     description: Retrieves the total revenue for the current week, considering only paid orders. Accessible only to admin users.
 *     tags: [Admin - Revenue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly revenue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                       example: 3500.75
 *                     week:
 *                       type: string
 *                       example: "2025-W12"
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/WeeklyRevenue", verifyToken, verifyAdmin, getWeeklyRevenue);

/**
 * @swagger
 * /api/v1/admin/total:
 *   get:
 *     summary: Get revenue comparison (Admin Only)
 *     description: Compares the revenue between the current period and the previous period. Accessible only to admin users.
 *     tags: [Admin - Revenue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentPeriod:
 *                       type: number
 *                       example: 15000.50
 *                     previousPeriod:
 *                       type: number
 *                       example: 12000.25
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/total", verifyToken, verifyAdmin, getRevenueComparison);

// Order Comparison (Admin Only)
/**
 * @swagger
 * /api/v1/admin/totalOrders:
 *   get:
 *     summary: Get order comparison (Admin Only)
 *     description: Compares the number of orders between the current period and the previous period. Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentPeriod:
 *                       type: integer
 *                       example: 150
 *                     previousPeriod:
 *                       type: integer
 *                       example: 120
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/totalOrders", verifyToken, verifyAdmin, getOrderComparison);

// User Comparison (Admin Only)
/**
 * @swagger
 * /api/v1/admin/totalUsers:
 *   get:
 *     summary: Get user comparison (Admin Only)
 *     description: Compares the number of users between the current period and the previous period. Accessible only to admin users.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentPeriod:
 *                       type: integer
 *                       example: 200
 *                     previousPeriod:
 *                       type: integer
 *                       example: 180
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/totalUsers", verifyToken, verifyAdmin, getUserComparison);

// Top Products (Admin Only)
/**
 * @swagger
 * /api/v1/admin/topRatedProducts:
 *   get:
 *     summary: Get top-rated products (Admin Only)
 *     description: Retrieves a list of top-rated products based on user ratings. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top-rated products retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: "12345"
 *                       name:
 *                         type: string
 *                         example: "Product Name"
 *                       rating:
 *                         type: number
 *                         example: 4.8
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/topRatedProducts", verifyToken, verifyAdmin, getTopRatedProducts);

/**
 * @swagger
 * /api/v1/admin/topOrderedProducts:
 *   get:
 *     summary: Get top-ordered products (Admin Only)
 *     description: Retrieves a list of top-ordered products based on order frequency. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Top-ordered products retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: "12345"
 *                       name:
 *                         type: string
 *                         example: "Product Name"
 *                       orderCount:
 *                         type: integer
 *                         example: 50
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/topOrderedProducts", verifyToken, verifyAdmin, getTopOrderedProductsController);

// Orders (Admin Only)
/**
 * @swagger
 * /api/v1/admin/allOrders:
 *   get:
 *     summary: Get all orders (Admin Only)
 *     description: Retrieves a list of all orders in the system. Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All orders retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       orderId:
 *                         type: string
 *                         example: "67890"
 *                       userId:
 *                         type: string
 *                         example: "user123"
 *                       totalAmount:
 *                         type: number
 *                         example: 99.99
 *                       status:
 *                         type: string
 *                         example: "pending"
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/allOrders", verifyToken, verifyAdmin, getAllOrders);

// Products Routes (Admin Only)
/**
 * @swagger
 * /api/v1/admin/products/all:
 *   get:
 *     summary: Get all products (Admin Only)
 *     description: Retrieves a list of all products in the system. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All products retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: "12345"
 *                       name:
 *                         type: string
 *                         example: "Product Name"
 *                       price:
 *                         type: number
 *                         example: 29.99
 *                       category:
 *                         type: string
 *                         example: "Electronics"
 *                       stock:
 *                         type: integer
 *                         example: 100
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/products/all", verifyToken, verifyAdmin, getAllProducts);

/**
 * @swagger
 * /api/v1/admin/products/add:
 *   post:
 *     summary: Create a new product (Admin Only)
 *     description: Creates a new product in the system. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the product
 *                 example: "Product Name"
 *               price:
 *                 type: number
 *                 description: The price of the product
 *                 example: 29.99
 *               category:
 *                 type: string
 *                 description: The category of the product
 *                 example: "Electronics"
 *               stock:
 *                 type: integer
 *                 description: The stock quantity of the product
 *                 example: 100
 *               description:
 *                 type: string
 *                 description: The description of the product
 *                 example: "A high-quality product"
 *               mainImage:
 *                 type: string
 *                 description: URL or path to the main image of the product
 *                 example: "uploads/product-image.jpg"
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                   example: Product created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: "12345"
 *                     name:
 *                       type: string
 *                       example: "Product Name"
 *                     price:
 *                       type: number
 *                       example: 29.99
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
 *                   example: Name, price, category, and stock are required
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.post("/products/add", verifyToken, verifyAdmin, createProduct);

/**
 * @swagger
 * /api/v1/admin/products/update/{product_id}:
 *   put:
 *     summary: Update a product (Admin Only)
 *     description: Updates an existing product in the system. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to update
 *         example: "12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The updated name of the product
 *                 example: "Updated Product Name"
 *               price:
 *                 type: number
 *                 description: The updated price of the product
 *                 example: 39.99
 *               category:
 *                 type: string
 *                 description: The updated category of the product
 *                 example: "Electronics"
 *               stock:
 *                 type: integer
 *                 description: The updated stock quantity of the product
 *                 example: 80
 *               description:
 *                 type: string
 *                 description: The updated description of the product
 *                 example: "An updated high-quality product"
 *               mainImage:
 *                 type: string
 *                 description: Updated URL or path to the main image of the product
 *                 example: "uploads/updated-product-image.jpg"
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: Product updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: "12345"
 *                     name:
 *                       type: string
 *                       example: "Updated Product Name"
 *                     price:
 *                       type: number
 *                       example: 39.99
 *       400:
 *         description: Bad request (e.g., invalid data)
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
 *                   example: Invalid data provided
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Product not found
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
 *                   example: Product not found
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
router.put("/products/update/:id", verifyToken, verifyAdmin, updateProduct);

/**
 * @swagger
 * /api/v1/admin/products/{product_id}:
 *   delete:
 *     summary: Delete a product (Admin Only)
 *     description: Deletes a product from the system. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to delete
 *         example: "12345"
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: Product deleted successfully
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Product not found
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
 *                   example: Product not found
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
router.delete("/products/:product_id", verifyToken, verifyAdmin, deleteProduct);

/**
 * @swagger
 * /api/v1/admin/products/import:
 *   post:
 *     summary: Import products from a CSV file (Admin Only)
 *     description: Imports multiple products into the system using a CSV file. Accessible only to admin users.
 *     tags: [Admin - Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The CSV file containing product data
 *     responses:
 *       200:
 *         description: Products imported successfully
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
 *                   example: Products imported successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       productId:
 *                         type: string
 *                         example: "12345"
 *                       name:
 *                         type: string
 *                         example: "Product Name"
 *       400:
 *         description: Bad request (e.g., missing file or invalid CSV format)
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
 *                   example: Invalid CSV file
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.post("/products/import", verifyToken, verifyAdmin, upload.single('file'), importProducts);

// Admin Authentication
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Admin login
 *     description: Authenticates an admin user and returns a JWT token for accessing protected admin routes.
 *     tags: [Admin - Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The admin's email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 description: The admin's password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Admin logged in successfully
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
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "jwt_token_here"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "admin123"
 *                         email:
 *                           type: string
 *                           example: "admin@example.com"
 *                         role:
 *                           type: string
 *                           example: "admin"
 *       400:
 *         description: Bad request (e.g., missing email or password)
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
 *                   example: Email and password are required
 *       401:
 *         description: Invalid credentials
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
 *                   example: Invalid email or password
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
router.post("/login", loginAdmin);

// Orders Routes (Admin Only)
/**
 * @swagger
 * /api/v1/admin/orders/{orderId}:
 *   get:
 *     summary: Get order details (Admin Only)
 *     description: Retrieves detailed information about a specific order. Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to retrieve
 *         example: "67890"
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       example: "67890"
 *                     userId:
 *                       type: string
 *                       example: "user123"
 *                     totalAmount:
 *                       type: number
 *                       example: 99.99
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           productId:
 *                             type: string
 *                             example: "12345"
 *                           quantity:
 *                             type: integer
 *                             example: 2
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
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
router.get("/orders/:orderId", verifyToken, verifyAdmin, getOrderDetailsForAdmin);

/**
 * @swagger
 * /api/v1/admin/orders/updatePaymentStatus/{orderId}:
 *   put:
 *     summary: Update payment status of an order (Admin Only)
 *     description: Updates the payment status of a specific order. Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to update
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 description: The new payment status of the order
 *                 example: "paid"
 *     responses:
 *       200:
 *         description: Payment status updated successfully
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
 *                   example: Payment status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       example: "67890"
 *                     paymentStatus:
 *                       type: string
 *                       example: "paid"
 *       400:
 *         description: Bad request (e.g., missing paymentStatus)
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
 *                   example: Payment status is required
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
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
router.put("/orders/updatePaymentStatus/:orderId", verifyToken, verifyAdmin, updatePaymentStatus);


/**
 * @swagger
 * /api/v1/admin/refund-requests:
 *   get:
 *     summary: Get orders with refund requests for admin
 *     security:
 *       - bearerAuth: []
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of orders per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order ID (exact match) or user name (partial match)
 *       - in: query
 *         name: refundStatus
 *         schema:
 *           type: string
 *           enum: ['NotInitiated', 'Pending', 'Processing', 'Completed', 'Failed']
 *           default: Pending
 *         description: Filter by refund status
 *     responses:
 *       200:
 *         description: Orders with refund requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful
 *                 message:
 *                   type: string
 *                   description: Message about the response
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       description: Total number of orders
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *                     currentPage:
 *                       type: integer
 *                       description: Current page number
 *                     itemsPerPage:
 *                       type: integer
 *                       description: Number of items per page
 *       400:
 *         description: Bad request (e.g., invalid query parameters)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not an admin
 *       404:
 *         description: No orders with refund requests found
 *       500:
 *         description: Internal server error
 */
router.get('/refund-requests', verifyToken, verifyAdmin, getOrdersWithRefundRequests);



/**
 * @swagger
 * /api/v1/admin/orders/updateRefundStatus/{orderId}:
 *   put:
 *     summary: Update refund status of an order (Admin Only)
 *     description: Updates the refund status of a specific order. Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema W:
 *           type: string
 *         description: The ID of the order to update
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refundStatus
 *             properties:
 *               refundStatus:
 *                 type: string
 *                 description: The new refund status of the order
 *                 example: "refunded"
 *     responses:
 *       200:
 *         description: Refund status updated successfully
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
 *                   example: Refund status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       example: "67890"
 *                     refundStatus:
 *                       type: string
 *                       example: "refunded"
 *       400:
 *         description: Bad request (e.g., missing refundStatus)
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
 *                   example: Refund status is required
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
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
router.put("/orders/updateRefundStatus/:orderId", verifyToken, verifyAdmin, updateRefundStatus);

/**
 * @swagger
 * /api/v1/admin/orders/updateOrderStatus/{orderId}:
 *   put:
 *     summary: Update order status (Admin Only)
 *     description: Updates the status of a specific order (e.g., pending, shipped, delivered). Accessible only to admin users.
 *     tags: [Admin - Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to update
 *         example: "67890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderStatus
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 description: The new status of the order
 *                 example: "shipped"
 *     responses:
 *       200:
 *         description: Order status updated successfully
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
 *                   example: Order status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       example: "67890"
 *                     orderStatus:
 *                       type: string
 *                       example: "shipped"
 *       400:
 *         description: Bad request (e.g., missing orderStatus)
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
 *                   example: Order status is required
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: Order not found
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
 *                   example: Order not found
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
router.put('/orders/updateOrderStatus/:orderId', verifyToken, verifyAdmin, updateOrderStatus);

// Users Routes (Admin Only)
/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (Admin Only)
 *     description: Retrieves a list of all users in the system. Accessible only to admin users.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All users retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "user123"
 *                       email:
 *                         type: string
 *                         example: "user@example.com"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       role:
 *                         type: string
 *                         example: "user"
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details (Admin Only)
 *     description: Retrieves detailed information about a specific user. Accessible only to admin users.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve
 *         example: "user123"
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user123"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     role:
 *                       type: string
 *                       example: "user"
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: User not found
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
 *                   example: User not found
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
router.get("/users/:id", verifyToken, verifyAdmin, getUserDetails);

/**
 * @swagger
 * /api/v1/admin/users/update/{id}:
 *   put:
 *     summary: Update a user (Admin Only)
 *     description: Updates an existing user's information. Accessible only to admin users.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *         example: "user123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The updated email of the user
 *                 example: "updated@example.com"
 *               name:
 *                 type: string
 *                 description: The updated name of the user
 *                 example: "Updated John Doe"
 *               role:
 *                 type: string
 *                 description: The updated role of the user
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: User updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user123"
 *                     email:
 *                       type: string
 *                       example: "updated@example.com"
 *                     name:
 *                       type: string
 *                       example: "Updated John Doe"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *       400:
 *         description: Bad request (e.g., invalid data)
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
 *                   example: Invalid data provided
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
 *       404:
 *         description: User not found
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
 *                   example: User not found
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
router.put("/users/update/:id", verifyToken, verifyAdmin, updateUser);

/**
 * @swagger
 * /api/v1/admin/users/create:
 *   post:
 *     summary: Create a new user (Admin Only)
 *     description: Creates a new user in the system. Accessible only to admin users.
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email of the new user
 *                 example: "newuser@example.com"
 *               password:
 *                 type: string
 *                 description: The password of the new user
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 description: The name of the new user
 *                 example: "New User"
 *               role:
 *                 type: string
 *                 description: The role of the new user
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User created successfully
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
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user123"
 *                     email:
 *                       type: string
 *                       example: "newuser@example.com"
 *                     name:
 *                       type: string
 *                       example: "New User"
 *                     role:
 *                       type: string
 *                       example: "user"
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
 *                   example: Email, password, and name are required
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
 *       403:
 *         description: Forbidden (user is not an admin)
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
 *                   example: Forbidden - Admin access required
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
router.post("/users/create", verifyToken, verifyAdmin, createUser);

module.exports = router;