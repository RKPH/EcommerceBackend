const express = require('express');
const verifyAccessToken = require('../middlewares/verifyToken');
const { addReview, getReviews } = require("../controllers/ReviewAndRatingController");
const router = express.Router();

// Route to add a review (protected route - user must be logged in)
router.post("/:id/add", verifyAccessToken, addReview);

// Route to get all reviews for a product
router.get("/:id/reviews", getReviews);

module.exports = router;
