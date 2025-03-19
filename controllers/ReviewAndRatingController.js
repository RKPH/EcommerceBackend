const reviewService = require('../Services/reviewService');

// Add a review to a product
exports.addReview = async (req, res) => {
    try {
        const { rating, comment, name, orderID } = req.body;
        const productId = req.params.id;
        const user = req.user;

        const { review } = await reviewService.addReview({
            userId: user?.userId,
            productId,
            rating,
            comment,
            name,
            orderID,
        });

        return res.status(201).json({ message: "Review added successfully.", review });
    } catch (error) {

        if (error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes("already reviewed")) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// Get all reviews for a product
exports.getReviews = async (req, res) => {
    try {
        const productId = req.params.id;

        const { reviews, averageRating } = await reviewService.getReviews({ productId });

        return res.status(200).json({ reviews, averageRating });
    } catch (error) {


        if (error.message.includes("No reviews")) {
            return res.status(404).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// Get a user's review for a specific product and order
exports.getUserReviewForProductOrder = async (req, res) => {
    try {
        const { orderID } = req.params;
        const productId = req.params.id;
        const user = req.user;

        const { review } = await reviewService.getUserReviewForProductOrder({
            userId: user?.userId,
            productId,
            orderID,
        });

        return res.status(200).json({ review });
    } catch (error) {


        if (error.message === "No review found for this product in this order.") {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === "Order ID is required.") {
            return res.status(400).json({ message: error.message });
        }
        if (error.message === "User must be logged in to view their review.") {
            return res.status(401).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};