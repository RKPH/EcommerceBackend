const express = require('express');
const router = express.Router();
const trackingController = require('../Services/trackingController');
const verifyToken = require('../middlewares/verifyToken');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserBehavior:
 *       type: object
 *       required:
 *         - user
 *         - sessionId
 *         - productId
 *         - behavior
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Session ID for tracking anonymous user behavior
 *         user:
 *           type: string
 *           description: User ID (MongoDB ObjectId) for logged-in users
 *         productId:
 *           type: string
 *           description: Product ID being interacted with
 *         behavior:
 *           type: string
 *           description: Type of behavior performed
 *           enum: [view, like, dislike, cart, purchase]
 *       example:
 *         sessionId: Ji6nPPn8VOy4PFj6KtYFPdC4ilU7wDXu
 *         user: 674043b91c6408d783f68ee6
 *         productId: 6740b3f22429dec7d21844f7
 *         behavior: view
 */

/**
 * @swagger
 * /api/v1/tracking:
 *   post:
 *     summary: Track user behavior for product interactions
 *     tags: [Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserBehavior'
 *     responses:
 *       201:
 *         description: Behavior tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User behavior tracked successfully"
 *       400:
 *         description: Missing required fields or invalid data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error tracking user behavior"
 */

/**
 * @swagger
 * tags:
 *   name: Tracking
 *   description: API for tracking user behaviors and interactions
 */

// POST /api/v1/tracking

router.post('/', verifyToken ,trackingController.trackUserBehavior);

module.exports = router;

