const express = require('express');
const { createOrder, getOrdersDetail, purchaseOrder, getOrderDetailByID, cancelOrder, submitRefundBankDetails, getOrdersWithRefundRequests } = require('../controllers/OrderController');
const verifyToken = require('../middlewares/verifyToken');
const { getUserReviewForProductOrder } = require("../controllers/ReviewAndRatingController");

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     ProductInOrder:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *           description: The ID of the product (populated with product details when retrieved)
 *         quantity:
 *           type: number
 *           description: Quantity of the product in the order
 *       required:
 *         - product
 *         - quantity
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique ID of the order
 *         user:
 *           type: string
 *           description: The ID of the user who placed the order
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProductInOrder'
 *         totalPrice:
 *           type: number
 *           description: The total price of the order
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the order was created
 *         DeliveredAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the order was delivered (optional)
 *         shippingAddress:
 *           type: string
 *           description: The shipping address for the order
 *         phoneNumber:
 *           type: string
 *           description: The phone number for contact (optional)
 *         PaymentMethod:
 *           type: string
 *           description: The payment method used for the order
 *         status:
 *           type: string
 *           enum: ['Draft', 'Pending', 'Confirmed', 'Delivered', 'Cancelled', 'CancelledByAdmin']
 *           description: The status of the order
 *         payingStatus:
 *           type: string
 *           enum: ['Paid', 'Unpaid', 'Failed']
 *           description: The payment status of the order
 *         shippingFee:
 *           type: number
 *           description: The shipping fee for the order (optional)
 *         cancellationReason:
 *           type: string
 *           description: The reason for cancellation (if applicable)
 *         history:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 description: The action taken (e.g., "Order placed", "Order cancelled")
 *               date:
 *                 type: string
 *                 description: The date and time of the action as a string
 *             required:
 *               - action
 *               - date
 *         PaidAt:
 *           type: string
 *           format: date-time
 *           description: The date and time the order was paid (optional)
 *         refundStatus:
 *           type: string
 *           enum: ['NotInitiated', 'Pending', 'Processing', 'Completed', 'Failed']
 *           description: The status of the refund process
 *         refundInfo:
 *           type: object
 *           properties:
 *             accountName:
 *               type: string
 *               description: The account holder's name for refund (optional)
 *             bankName:
 *               type: string
 *               description: The bank name for refund (optional)
 *             accountNumber:
 *               type: string
 *               description: The account number for refund (optional)
 *       required:
 *         - user
 *         - products
 *         - createdAt
 *         - shippingAddress
 *         - PaymentMethod
 *         - status
 *         - payingStatus
 */

/**
 * @swagger
 * /api/v1/orders/addOrder:
 *   post:
 *     summary: Create a new order
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                       description: The ID of the product
 *                     quantity:
 *                       type: number
 *                       description: The quantity of the product
 *                   required:
 *                     - product
 *                     - quantity
 *               totalPrice:
 *                 type: number
 *                 description: The total price of the order
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *                 description: The date and time the order was created
 *               shippingAddress:
 *                 type: string
 *                 description: The shipping address for the order
 *               phoneNumber:
 *                 type: string
 *                 description: The phone number for contact (optional)
 *               PaymentMethod:
 *                 type: string
 *                 description: The payment method used for the order
 *               shippingFee:
 *                 type: number
 *                 description: The shipping fee for the order (optional)
 *             required:
 *               - products
 *               - totalPrice
 *               - createdAt
 *               - shippingAddress
 *               - PaymentMethod
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/addOrder', verifyToken, createOrder);

/**
 * @swagger
 * /api/v1/orders/getUserOrders:
 *   get:
 *     summary: Get all orders for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
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
 *         description: The number of orders per page
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
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/getUserOrders', verifyToken, getOrdersDetail);

/**
 * @swagger
 * /api/v1/orders/purchase:
 *   post:
 *     summary: Purchase an order (change status to "Confirmed" and clear cart)
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The ID of the order to purchase
 *             required:
 *               - orderId
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
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post('/purchase', verifyToken, purchaseOrder);

/**
 * @swagger
 * /api/v1/orders/getUserDetailById/{orderId}:
 *   get:
 *     summary: Get order details by order ID
 *     security:
 *       - bearerAuth: []
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
 *         description: Order details retrieved successfully
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
 *                   $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have access to this order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.get('/getUserDetailById/:orderId', verifyToken, getOrderDetailByID);

/**
 * @swagger
 * /api/v1/orders/cancle/{id}:
 *   post:
 *     summary: Cancel an order
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to cancel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 description: The reason for cancelling the order
 *             required:
 *               - cancellationReason
 *     responses:
 *       200:
 *         description: Order cancelled successfully
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
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid request body or order cannot be cancelled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have access to this order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post('/cancle/:id', verifyToken, cancelOrder);

/**
 * @swagger
 * /api/v1/orders/{id}/refund-details:
 *   post:
 *     summary: Submit refund bank details for an order
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to submit refund details for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refundInfo:
 *                 type: object
 *                 properties:
 *                   accountName:
 *                     type: string
 *                     description: The account holder's name for refund
 *                   bankName:
 *                     type: string
 *                     description: The bank name for refund
 *                   accountNumber:
 *                     type: string
 *                     description: The account number for refund
 *                 required:
 *                   - accountName
 *                   - bankName
 *                   - accountNumber
 *             required:
 *               - refundInfo
 *     responses:
 *       200:
 *         description: Refund bank details submitted successfully
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
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid request body or refund cannot be requested
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have access to this order
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
router.post('/:id/refund-details', verifyToken, submitRefundBankDetails);

/**
 * @swagger
 * /api/v1/orders/{orderID}/products/{id}/review:
 *   get:
 *     summary: Get the user's review for a product in an order
 *     security:
 *       - bearerAuth: []
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order containing the product
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to retrieve the review for
 *     responses:
 *       200:
 *         description: Review retrieved successfully
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
 *                   properties:
 *                     rating:
 *                       type: number
 *                       description: The rating given by the user (1-5)
 *                     comment:
 *                       type: string
 *                       description: The review comment
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: The date the review was created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User does not have access to this order
 *       404:
 *         description: Order or product not found, or no review exists
 *       500:
 *         description: Internal server error
 */
router.get('/:orderID/products/:id/review', verifyToken, getUserReviewForProductOrder);


module.exports = router;