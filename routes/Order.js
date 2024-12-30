const express = require('express');
const { createOrder, getAllOrders } = require('../controllers/orderController'); // Adjust path as needed
const verifyToken = require('../middlewares/verifyToken'); // Adjust path as needed

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductInOrder:
 *       type: object
 *       properties:
 *         product:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: The unique ID of the product
 *             name:
 *               type: string
 *               description: The name of the product
 *             price:
 *               type: number
 *               description: The price of the product
 *         quantity:
 *           type: number
 *           description: Quantity of the product in the order
 *
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique ID of the order
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         shippingAddress:
 *           type: string
 *           description: Address for shipping the order
 *         PaymentMethod:
 *           type: string
 *           description: Payment method used for the order
 *         status:
 *           type: string
 *           description: Status of the order
 *           enum:
 *             - Pending
 *             - Processing
 *             - Shipped
 *             - Delivered
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The time when the order was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The time when the order was last updated
 */

/**
 * @swagger
 * /api/v1/orders/addOrder:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *                 description: User ID placing the order
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: Product ID
 *                     quantity:
 *                       type: number
 *                       description: Quantity of the product
 *               shippingAddress:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/addOrder', verifyToken, createOrder);

/**
 * @swagger
 * /api/v1/orders/get:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the response
 *                 message:
 *                   type: string
 *                   description: Message about the response
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 */
router.get('/get', verifyToken, getAllOrders);

module.exports = router;
