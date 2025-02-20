const Review = require('../models/reviewSchema');
const Product = require("../models/products");



// Add a review to a product
exports.addReview = async (req, res) => {
    try {
        const { rating, comment, name } = req.body;
        const productId = req.params.id;
        const user = req.user; // Assume user is retrieved from auth middleware

        if (!user) {
            return res.status(401).json({ message: "You must be logged in to submit a review." });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Invalid rating. Must be between 1 and 5." });
        }

        if (!comment) {
            return res.status(400).json({ message: "Review comment is required." });
        }

        if (!name) {
            return res.status(400).json({ message: "Name is required." });
        }

        const product = await Product.findOne({ productID: productId });
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Check if user already reviewed the product
        const existingReview = await Review.findOne({ user: user.id, productID: productId });
        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this product." });
        }

        // Create a new review
        const newReview = new Review({
            user: user.userId,
            name,
            productID: productId,
            rating,
            comment,
            date: new Date(),
        });

        await newReview.save();

        // Recalculate the average rating
        const reviews = await Review.find({ productID: productId });
        const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

        // Update the product's average rating
        product.rating = averageRating;
        await product.save();

        res.status(201).json({ message: "Review added successfully.", review: newReview });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Get all reviews for a product
exports.getReviews = async (req, res) => {
    try {
        const productId = req.params.id;

        // Find all reviews for the given product
        const reviews = await Review.find({ productID: productId }).sort({ date: -1 });

        if (reviews.length === 0) {
            return res.status(404).json({ message: "No reviews found for this product." });
        }

        res.status(200).json({
            reviews,
            averageRating: reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
        });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

