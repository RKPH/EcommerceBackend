const express = require('express');
const verifyAccessToken = require('../middlewares/verifyToken');
const { addReview, getReviews, getUserReviewForProductOrder } = require("../controllers/ReviewAndRatingController");
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - user
 *         - orderID
 *         - name
 *         - rating
 *         - comment
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the review
 *           example: 60d5f3f5c123456789abcdef
 *         user:
 *           $ref: '#/components/schemas/User'
 *           description: The user who wrote the review
 *         orderID:
 *           $ref: '#/components/schemas/Order'
 *           description: The order associated with this review
 *         product_id:
 *           type: number
 *           description: The ID of the product being reviewed
 *           example: 12345
 *         name:
 *           type: string
 *           description: The name of the reviewer
 *           example: John Doe
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: The rating given to the product (1 to 5)
 *           example: 4
 *         comment:
 *           type: string
 *           description: The review comment
 *           example: Great product, very satisfied!
 *         date:
 *           type: string
 *           format: date-time
 *           description: The date the review was created (defaults to the current date)
 *           example: 2025-03-31T09:02:53.000Z
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the user
 *           example: 60d5f3f5c123456789abcdef
 *         username:
 *           type: string
 *           description: The username of the user
 *           example: johndoe
 *       description: A user who can write reviews (simplified for reference)
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the order
 *           example: 60d5f3f5c123456789abcdef
 *         orderNumber:
 *           type: string
 *           description: The order number
 *           example: ORD12345
 *       description: An order associated with a review (simplified for reference)
 */

/**
 * @swagger
 * /api/v1/products/{id}/add:
 *   post:
 *     summary: Add a review for a product
 *     description: Allows a logged-in user to add a review for a specific product. The user must be authenticated via an access token.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comment
 *               - name
 *               - orderID
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: The rating for the product (1 to 5)
 *                 example: 4
 *               comment:
 *                 type: string
 *                 description: The review comment
 *                 example: Great product, very satisfied!
 *               name:
 *                 type: string
 *                 description: The name of the reviewer
 *                 example: John Doe
 *               orderID:
 *                 type: string
 *                 description: The ID of the order associated with this review
 *                 example: 60d5f3f5c123456789abcdef
 *     responses:
 *       201:
 *         description: Review added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review added successfully.
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *             example:
 *               message: Review added successfully.
 *               review:
 *                 _id: 60d5f3f5c123456789abcdef
 *                 user:
 *                   _id: 60d5f3f5c123456789abcdef
 *                   username: johndoe
 *                 orderID:
 *                   _id: 60d5f3f5c123456789abcdef
 *                   orderNumber: ORD12345
 *                 product_id: 12345
 *                 name: John Doe
 *                 rating: 4
 *                 comment: Great product, very satisfied!
 *                 date: 2025-03-31T09:02:53.000Z
 *       400:
 *         description: Bad request (e.g., user has already reviewed this product)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User has already reviewed this product.
 *       401:
 *         description: Unauthorized (e.g., missing or invalid access token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *       404:
 *         description: Not found (e.g., product not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.post("/:id/add", verifyAccessToken, addReview);

/**
 * @swagger
 * /api/v1/products/{id}/reviews:
 *   get:
 *     summary: Get all reviews for a product
 *     description: Retrieves all reviews and the average rating for a specific product.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to retrieve reviews for
 *     responses:
 *       200:
 *         description: Successfully retrieved reviews and average rating
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *                 averageRating:
 *                   type: number
 *                   example: 4.5
 *             example:
 *               reviews:
 *                 - _id: 60d5f3f5c123456789abcdef
 *                   user:
 *                     _id: 60d5f3f5c123456789abcdef
 *                     username: johndoe
 *                   orderID:
 *                     _id: 60d5f3f5c123456789abcdef
 *                     orderNumber: ORD12345
 *                   product_id: 12345
 *                   name: John Doe
 *                   rating: 4
 *                   comment: Great product, very satisfied!
 *                   date: 2025-03-31T09:02:53.000Z
 *                 - _id: 60d5f3f5c123456789abcdee
 *                   user:
 *                     _id: 60d5f3f5c123456789abcdee
 *                     username: janedoe
 *                   orderID:
 *                     _id: 60d5f3f5c123456789abcdee
 *                     orderNumber: ORD12346
 *                   product_id: 12345
 *                   name: Jane Doe
 *                   rating: 5
 *                   comment: Excellent quality!
 *                   date: 2025-03-31T10:00:00.000Z
 *               averageRating: 4.5
 *       404:
 *         description: No reviews found for this product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No reviews found for this product.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/:id/reviews", getReviews);

/**
 * @swagger
 * /api/v1/products/{id}/reviews/{orderID}:
 *   get:
 *     summary: Get a user's review for a specific product and order
 *     description: Retrieves a user's review for a specific product and order. The user must be authenticated via an access token.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product
 *       - in: path
 *         name: orderID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order associated with the review
 *     responses:
 *       200:
 *         description: Successfully retrieved the user's review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *             example:
 *               review:
 *                 _id: 60d5f3f5c123456789abcdef
 *                 user:
 *                   _id: 60d5f3f5c123456789abcdef
 *                   username: johndoe
 *                 orderID:
 *                   _id: 60d5f3f5c123456789abcdef
 *                   orderNumber: ORD12345
 *                 product_id: 12345
 *                 name: John Doe
 *                 rating: 4
 *                 comment: Great product, very satisfied!
 *                 date: 2025-03-31T09:02:53.000Z
 *       400:
 *         description: Bad request (e.g., order ID is required)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Order ID is required.
 *       401:
 *         description: Unauthorized (e.g., user must be logged in)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User must be logged in to view their review.
 *       404:
 *         description: No review found for this product in this order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No review found for this product in this order.
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
router.get("/:id/reviews/:orderID", verifyAccessToken, getUserReviewForProductOrder);

module.exports = router;