﻿const Review = require('../models/reviewSchema');
const Product = require("../models/products");



// Add a review to a product
exports.addReview = async (req, res) => {
    try {
        const { rating, comment, name, orderID } = req.body;
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

        if (!orderID) {
            return res.status(400).json({ message: "Order ID is required to review a product." });
        }

        const product = await Product.findOne({ productID: productId });
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Check if user already reviewed this product in this specific order



        const existingReview = await Review.findOne({
            user: user.userId,
            productID: productId,
            orderID: orderID
        });

        if (existingReview) {
            return res.status(400).json({ message: "You have already reviewed this product for this order." });
        }

        // Create a new review
        const newReview = new Review({
            user: user.userId,
            orderID,
            name,
            productID: productId,
            rating,
            comment,
            date: new Date(),
        });

        await newReview.save();

        // Recalculate the average rating
        const reviews = await Review.find({ productID: productId });

        console.log("reviews", reviews);


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


exports.getReviews = async (req, res) => {
    try {
        const productId = req.params.id;

        // Find all reviews for the given product and populate user details
        const reviews = await Review.find({ productID: productId })
            .sort({ date: -1 })
            .populate('user', 'name avatar'); // Populate the user's name and avatar

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

exports.getUserReviewForProductOrder = async (req, res) => {
    try {
        const { orderID } = req.params; // Order ID from URL params
        const productId = req.params.id; // Product ID from URL params
        const user = req.user; // Assume user is attached by auth middleware (like req.user.userId)

        if (!user) {
            return res.status(401).json({ message: "You must be logged in to view your review." });
        }

        if (!orderID) {
            return res.status(400).json({ message: "Order ID is required." });
        }

        // Find the review made by the logged-in user for this product in this specific order
        const review = await Review.findOne({
            user: user.userId,
            productID: productId,
            orderID: orderID
        });

        if (!review) {
            return res.status(404).json({ message: "No review found for this product in this order." });
        }

        res.status(200).json({
            review
        });
    } catch (error) {
        console.error("Error fetching review:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

