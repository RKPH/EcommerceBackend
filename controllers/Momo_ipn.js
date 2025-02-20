const Order = require('../models/Order');
const Cart = require("../models/cart");


exports.momoIPNHandler = async (req, res) => {
    try {
        const { orderId, resultCode } = req.body;

        console.log("🔔 Received IPN from MoMo:", req.body);

        // Find the order
        const order = await Order.findById(orderId).populate('products.product').exec();
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        if (resultCode === 0) {
            // ✅ Payment success -> Keep order "Pending" but mark payment as "Paid"
            order.status = 'Pending';
            order.payingStatus = 'Paid';

            // ✅ Clear the cart now since payment is confirmed
            await clearUserCart(order.user, order.products);
            console.log("🛒 Cart cleared for user:", order.user.toString());
        } else {
            // ❌ Payment failed -> Set order status to "Draft" and payment to "Failed"
            order.status = 'Draft';
            order.payingStatus = 'Failed';
        }

        await order.save();

        return res.status(200).json({ status: 'success', message: 'Order updated' });
    } catch (error) {
        console.error("❌ Error processing MoMo IPN:", error);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

const clearUserCart = async (userId, productsInOrder) => {
    try {
        // Extract product IDs from the order's products array
        const productIdsInOrder = productsInOrder.map(item => item.product); // Assuming 'product' is the field in the order product

        // Delete cart items that are in the order
        const result = await Cart.deleteMany({
            user: userId,
            product: { $in: productIdsInOrder },
        });

        if (result.deletedCount === 0) {
            console.log(`No cart items found for user: ${userId} matching order products`);
            return false; // No items to delete
        }

        console.log(`Cart cleared for user: ${userId} for order products`);
        return true;
    } catch (error) {
        console.error('Error clearing cart:', error.message);
        return false;
    }
};

