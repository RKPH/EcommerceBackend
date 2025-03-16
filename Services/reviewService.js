const Review = require('../models/reviewSchema');
const Product = require('../models/products');

// Service to add a review to a product
exports.addReview = async ({ userId, productId, rating, comment, name, orderID }) => {
    try {
        // Validate inputs
        if (!userId) {
            throw new Error("User must be logged in to submit a review.");
        }

        if (!rating || rating < 1 || rating > 5) {
            throw new Error("Invalid rating. Must be between 1 and 5.");
        }

        if (!comment) {
            throw new Error("Review comment is required.");
        }

        if (!name) {
            throw new Error("Name is required.");
        }

        if (!orderID) {
            throw new Error("Order ID is required to review a product.");
        }

        // Check if the product exists
        const product = await Product.findOne({ product_id: productId });
        if (!product) {
            throw new Error("Product not found.");
        }

        // Check if user already reviewed this product in this specific order
        const existingReview = await Review.findOne({
            user: userId,
            product_id: productId,
            orderID: orderID,
        });

        if (existingReview) {
            throw new Error("You have already reviewed this product for this order.");
        }

        // Create a new review
        const newReview = new Review({
            user: userId,
            orderID,
            name,
            product_id: productId,
            rating,
            comment,
            date: new Date(),
        });

        await newReview.save();

        // Recalculate the average rating
        const reviews = await Review.find({ product_id: productId });
        const averageRating = reviews.length > 0
            ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
            : 0;

        // Update the product's average rating
        product.rating = averageRating;
        await product.save();

        return { review: newReview };
    } catch (error) {
        throw new Error(error.message || "Internal server error.");
    }
};

// Service to get all reviews for a product
exports.getReviews = async ({ productId }) => {
    try {
        const reviews = await Review.find({ product_id: productId })
            .sort({ date: -1 })
            .populate('user', 'name avatar');

        if (reviews.length === 0) {
            throw new Error("No reviews found for this product.");
        }

        const averageRating = reviews.length > 0
            ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
            : 0;

        return { reviews, averageRating };
    } catch (error) {
        throw new Error(error.message || "Internal server error.");
    }
};

// Service to get a user's review for a specific product and order
exports.getUserReviewForProductOrder = async ({ userId, productId, orderID }) => {
    try {
        if (!userId) {
            throw new Error("User must be logged in to view their review.");
        }

        if (!orderID) {
            throw new Error("Order ID is required.");
        }

        const review = await Review.findOne({
            user: userId,
            product_id: productId,
            orderID: orderID,
        });

        if (!review) {
            throw new Error("No review found for this product in this order.");
        }

        return { review };
    } catch (error) {
        throw new Error(error.message || "Internal server error.");
    }
};