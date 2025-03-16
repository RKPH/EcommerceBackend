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

        res.status(201).json({ message: "Review added successfully.", review });
    } catch (error) {
        console.error("Error adding review:", error.message);
        res.status(error.message.includes("not found") ? 404 : error.message.includes("already reviewed") ? 400 : 500)
            .json({ message: error.message });
    }
};

// Get all reviews for a product
exports.getReviews = async (req, res) => {
    try {
        const productId = req.params.id;

        const { reviews, averageRating } = await reviewService.getReviews({ productId });

        res.status(200).json({ reviews, averageRating });
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        res.status(error.message.includes("No reviews") ? 404 : 500)
            .json({ message: error.message });
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

        res.status(200).json({ review });
    } catch (error) {
        console.error("Error fetching review:", error.message);

        // Log the exact error message for debugging
        console.log("Error message:", error.message);

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