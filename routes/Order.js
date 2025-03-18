const express = require('express');
const { createOrder, getOrdersDetail, purchaseOrder , getOrderDetailByID, cancelOrder,
    submitRefundBankDetails
} = require('../controllers/OrderController'); // Adjust path as needed
const verifyToken = require('../middlewares/verifyToken');
const {getUserReviewForProductOrder} = require("../controllers/ReviewAndRatingController");
const {getAllOrders} = require("../controllers/AdminController"); // Adjust path as needed

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
 * /api/v1/orders/getUserOrders:
 *   get:
 *     summary: Get orders for the authenticated user
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
router.get('/getUserOrders', verifyToken, getOrdersDetail);

/**
 * @swagger
 * /api/v1/orders/purchase:
 *   post:
 *     summary: Purchase an order (change status to "Purchased" and clear cart)
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Order purchased and cart cleared
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
 *                   type: object
 *                   description: Updated order
 *       404:
 *         description: Pending order not found
 *       500:
 *         description: Internal server error
 */
router.post('/purchase', verifyToken, purchaseOrder);



/**
 * @swagger
 * /api/v1/orders/getUserDetailById/{orderId}:
 *   get:
 *     summary: Get user details by order ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to retrieve details for
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
 *                   description: Status of the response
 *                 message:
 *                   type: string
 *                   description: Message about the response
 *                 data:
 *                   type: object
 *                   description: order details
 *       404:
 *         description: order not found
 *       500:
 *         description: Internal server error
 */
router.get('/getUserDetailById/:orderId', verifyToken, getOrderDetailByID);

router.post('/cancle/:id', verifyToken, cancelOrder);

router.post('/:id/refund-details',verifyToken, submitRefundBankDetails);

router.get('/:orderID/products/:id/review', verifyToken, getUserReviewForProductOrder);

module.exports = router;


