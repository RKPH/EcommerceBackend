const crypto = require('crypto'); // CommonJS syntax (adjust to 'import' if using ES modules)
const Order = require('../models/Order');
const Cart = require("../models/cart");

// Helper functions from your example
function sortObjDataByKey(object) {
    const orderedObject = Object.keys(object)
        .sort()
        .reduce((obj, key) => {
            obj[key] = object[key];
            return obj;
        }, {});
    return orderedObject;
}

function convertObjToQueryStr(object) {
    return Object.keys(object)
        .filter((key) => object[key] !== undefined)
        .map((key) => {
            let value = object[key];
            if (value && Array.isArray(value)) {
                value = JSON.stringify(value.map((val) => sortObjDataByKey(val)));
            }
            if ([null, undefined, "undefined", "null"].includes(value)) {
                value = "";
            }
            return `${key}=${value}`;
        })
        .join("&");
}

exports.handlePayOSConfirmWebhook = async (req, res) => {
    try {
        const PAYOS_CHECKSUM_KEY = '21cf69f90ea459a7c2fee82d41402465223fdb990c7c26764436f2f28c66658d'; // Updated to match your latest example
        const webhookData = req.body;

        console.log("🔔 Received Confirm Webhook from PayOS:", JSON.stringify(webhookData, null, 2));

        // Handle PayOS dashboard test request
        if (!webhookData || Object.keys(webhookData).length === 0 || (!webhookData.data && !webhookData.signature)) {
            console.log("ℹ️ Detected test request from PayOS dashboard (minimal payload)");
            return res.status(200).json({ status: 'success', message: 'Webhook test received' });
        }



        const paymentData = webhookData.data;

        // Calculate signature using your provided logic
        const sortedData = sortObjDataByKey(paymentData);


        const dataQueryStr = convertObjToQueryStr(sortedData);



        const calculatedSignature = crypto.createHmac("sha256", PAYOS_CHECKSUM_KEY)
            .update(dataQueryStr)
            .digest("hex");

        console.log("Signature Debug:", { rawSignature: dataQueryStr, received: webhookData.signature, calculated: calculatedSignature });

        if (webhookData.signature !== calculatedSignature) {
            console.log('Invalid webhook signature:', { received: webhookData.signature, calculated: calculatedSignature });
            return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
        }

        // Extract original orderId from orderCode (assuming orderCode is the full MongoDB _id)
        const numericOrderId = Number(paymentData.orderCode); // e.g., 5, 10
        const originalOrderId = numericOrderId.toString().padStart(4, '0');
        console.log(`Extracted originalOrderId: ${originalOrderId}`);

        const order = await Order.findOne({order_id: originalOrderId}).populate('products.product').exec();
        if (!order) {
            console.log(`Order not found for originalOrderId: ${originalOrderId}`);

        }

        // Process the order based on webhook status
        if (webhookData.code === '00' && (paymentData.status === 'PAID' || webhookData.desc === 'success')) {
            order.status = 'Pending';
            order.payingStatus = 'Paid';
            order.history.push({
                date: formatDate(new Date()),
                action: 'Order is paid via PayOS.'
            });
            order.PaidAt = new Date();

            await clearUserCart(order.user, order.products);
            console.log("🛒 Cart cleared for user:", order.user.toString());
        } else {
            order.status = 'Draft';
            order.payingStatus = 'Failed';
            order.history.push({
                date: formatDate(new Date()),
                action: `Payment failed via PayOS: ${webhookData.desc || 'Unknown error'}`
            });
            console.log(`Payment failed for order ${originalOrderId}: ${webhookData.desc}`);
        }

        await order.save();
        console.log(`Order ${originalOrderId} updated successfully`);

        return res.status(200).json({ status: 'success', message: 'Order updated' });
    } catch (error) {
        console.error("❌ Error processing PayOS Confirm Webhook:", error.message, error.stack);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Helper functions
const clearUserCart = async (userId, productsInOrder) => {
    try {
        const productIdsInOrder = productsInOrder.map(item => item.product);
        const result = await Cart.deleteMany({
            user: userId,
            product: { $in: productIdsInOrder },
        });

        if (result.deletedCount === 0) {
            console.log(`No cart items found for user: ${userId} matching order products`);
            return false;
        }

        console.log(`Cart cleared for user: ${userId} for order products`);
        return true;
    } catch (error) {
        console.error('Error clearing cart:', error.message);
        return false;
    }
};

function formatDate(date) {
    const offset = 7; // Adjust for your timezone (e.g., UTC+7)
    date.setHours(date.getHours() + offset);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
}