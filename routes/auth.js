const express = require('express');
const router = express.Router();

// Import controllers
const { registerUser, loginUser, getUserProfile } = require('../controllers/authController'); // Update the path if necessary
const  authorizationMiddleware =require('../middlewares/authorizationMIddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The user ID (MongoDB ObjectId)
 *         name:
 *           type: string
 *           description: The name of the user
 *         email:
 *           type: string
 *           description: The email address of the user
 *           format: email
 *         password:
 *           type: string
 *           description: The hashed password of the user
 *           writeOnly: true
 *       example:
 *         id: 63f9b25c4f0e1234abc12345
 *         name: John Doe
 *         email: johndoe@example.com
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: The user's name
 *               email:
 *                 type: string
 *                 description: The user's email
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/auth/register', registerUser);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and return a token
 *     tags: [Auth]
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
 *                 description: The user's email
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */
router.post('/auth/login', loginUser);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get user profile information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []  # Ensure the request is authenticated via token
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The user ID (MongoDB ObjectId)
 *                 name:
 *                   type: string
 *                   description: The user's name
 *                 email:
 *                   type: string
 *                   description: The user's email
 *       401:
 *         description: Unauthorized - No token provided or token is invalid
 *       403:
 *         description: Forbidden - Invalid token
 *       500:
 *         description: Server error
 */
router.get('/auth/profile', authorizationMiddleware, getUserProfile); // Apply protectRoute here

module.exports = router;
