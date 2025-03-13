const Order = require('../models/Order');
const Cart = require("../models/cart");

exports.momoIPNHandler = async (req, res) => {
    try {
        const { orderId, resultCode } = req.body;

        console.log("🔔 Received IPN from MoMo:", req.body);

        // Extract the original orderId (before the timestamp) from MoMo's orderId
        const originalOrderId = orderId.split('-')[0]; // Assumes format is "orderId-timestamp"

        // Find the order using the original orderId
        const order = await Order.findById(originalOrderId).populate('products.product').exec();
        if (!order) {
            console.error(`Order not found for originalOrderId: ${originalOrderId}`);
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        if (resultCode === 0) {
            // ✅ Payment success -> Keep order "Pending" but mark payment as "Paid"
            order.status = 'Pending';
            order.payingStatus = 'Paid';
            order.history.push({
                date: formatDate(new Date()),
                action: 'Order is paid via MoMo.',
            });
            order.PaidAt = new Date();

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

function formatDate(date) {
    const offset = 7; // Adjust this to your desired timezone offset (Vietnam Time is GMT+7)
    date.setHours(date.getHours() + offset);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
}