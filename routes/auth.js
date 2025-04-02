const express = require('express');
const router = express.Router();
const verifyAccessToken = require('../middlewares/verifyToken');

const { registerUser, loginUser, getUserProfile, refreshAccessToken, logoutUser, verifyUser, forgotPassword, resetPassword } = require('../controllers/authController'); // Update the path if necessary

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
router.post('/register', registerUser);

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
router.post('/login', loginUser);

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
router.get('/profile', verifyAccessToken, getUserProfile);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh the access token using a valid refresh token from cookies or session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: The new access token
 *       401:
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Server error
 */
router.post('/refresh-token', refreshAccessToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out the user and clear the session or cookies
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Server error
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /api/v1/auth/verify:
 *   post:
 *     summary: Verify the user's access token and return user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []  # Ensure the request is authenticated via token
 *     responses:
 *       200:
 *         description: User verified successfully
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
router.post('/verify', verifyAccessToken, verifyUser);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link via email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email address
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *       400:
 *         description: Invalid email or user not found
 *       500:
 *         description: Server error
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset the user's password using a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token received via email
 *               newPassword:
 *                 type: string
 *                 description: The new password for the user
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token, or invalid new password
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPassword);

module.exports = router;