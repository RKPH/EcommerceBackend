const Order = require('../models/Order');
const Product = require('../models/products'); // Make sure to import your Product model
const Cart = require("../models/cart");
const User = require("../models/user");
const {trackUserBehavior} = require("../controllers/trackingController");
const crypto = require("crypto");
const https = require('https');
const {sendCancellationEmail} = require('../Services/Email')


exports.createOrder = async (req, res) => {
    const { userId } = req.user; // Extract userId from authenticated user
    const {orderID ,products, shippingAddress, PaymentMethod } = req.body;

    try {
        // Validate request
        if (!products || !products.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Order must include at least one product',
            });
        }

        // Check for an existing pending order
        const existingOrder = await Order.findOne({
            user: userId,
            status: 'Draft', // Adjust status field based on your schema
        });

        if (existingOrder) {
            // Compare current cart items with existing order items
            const isSameOrder = existingOrder.products.length === products.length &&
                existingOrder.products.every((existingProduct) =>
                    products.some(
                        (newProduct) =>
                            newProduct.product === existingProduct.product.toString() &&
                            newProduct.quantity === existingProduct.quantity
                    )
                );

            if (!isSameOrder) {
                // Update the order if the cart items differ
                existingOrder.products = products.map((item) => ({
                    product: item.product,
                    quantity: item.quantity,
                }));

                existingOrder.shippingAddress = shippingAddress;
                existingOrder.PaymentMethod = PaymentMethod;

                await existingOrder.save(); // Save changes to the database

                return res.status(200).json({
                    status: 'success',
                    message: 'Order updated successfully',
                    data: existingOrder,
                });
            }

            // If the cart items are the same, return the existing order
            return res.status(200).json({
                status: 'success',
                message: 'Order already exists',
                data: existingOrder,
            });
        }

        // If no pending order exists, create a new one
        const newOrder = new Order({
            user: userId,
            orderID: orderID,
            products: products.map((item) => ({
                product: item.product,
                quantity: item.quantity,
            })),
            shippingAddress,
            PaymentMethod,
            createdAt: new Date(), // Set initial creation date
            DeliveredAt: null, // Set initial delivery status
            status: 'Draft', // Set initial status
            history: [
            ]
        });

        const savedOrder = await newOrder.save();

        return res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            data: savedOrder,
        });
    } catch (error) {
        console.error('Error creating or updating order:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

// Get All Orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('products.product').lean(); // Populate product details

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No orders found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Orders retrieved successfully',
            data: orders,
        });
    } catch (error) {
        console.error('Error retrieving orders:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

exports.getOrdersDetail = async (req, res) => {
    console.log("users", req.user)
    const { userId } = req.user; // Extract userId from authenticated user
    try {
        // Retrieve orders for the specific user, populate products, and sort by createdAt in descending order (newest first)
        const orders = await Order.find({ user: req.user.userId })
            .populate('products.product')
            .sort({ createdAt: -1 }); // -1 means descending, 1 means ascending

        // Check if no orders were found for the user
        if (orders.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `No orders found for user ${userId}`,
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Order details retrieved successfully',
            data: orders,
        });
    } catch (error) {
        console.error('Error retrieving order details:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};


exports.purchaseOrder = async (req, res) => {
    const { userId } = req.user;
    const {userID, orderId, shippingAddress ,deliverAt, paymentMethod, totalPrice, sessionID} = req.body;
    console.log("address", shippingAddress);

    try {
        // Fetch order and populate products
        const order = await Order.findById(orderId).populate('products.product').exec();
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'No pending order found' });
        }

        if (paymentMethod === 'momo') {
            // ✅ MoMo payments: Wait for IPN to confirm
            order.status = 'Draft'; // MoMo order is only confirmed after IPN
            order.payingStatus = 'Unpaid';
        } else {
            // ✅ Non-MoMo payments: Confirm order immediately
            order.status = 'Pending';
            order.payingStatus = 'Unpaid';
        }


        // Update order details
        order.shippingAddress = shippingAddress;
        order.PaymentMethod = paymentMethod;
        order.CreatedAt = new Date();
        order.DeliveredAt = deliverAt;
        order.totalPrice = totalPrice;
        if(order.PaymentMethod === 'cod') {
            order.history.push({
                date: formatDate(new Date()),
                action: 'Order placed and pending processing.',
            });
        }


        await order.save();



        if (paymentMethod === 'momo') {
            // ✅ MoMo Payment Flow
            const accessKey = 'F8BBA842ECF85';
            const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
            const partnerCode = 'MOMO';
            const amount = 10000
            const redirectUrl = `http://localhost:5173/checkout/success/${orderId}`;
            const ipnUrl = 'https://eight-chicken-train.loca.lt/api/v1/webhook/momo-ipn';  // ✅ Ensure this matches your actual IPN URL
            const orderInfo = 'pay with MoMo';
            const requestId = `${orderId}-${Date.now()}`;
            const extraData = '';
            const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=payWithMethod`;
            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const requestBody = JSON.stringify({
                partnerCode,
                partnerName: 'Test',
                storeId: 'MomoTestStore',
                requestId,
                amount: 10000, // ✅ Use actual total price
                orderId,
                orderInfo,
                redirectUrl,
                ipnUrl,
                lang: 'vi',
                requestType: 'payWithMethod',
                autoCapture: true,
                extraData,
                signature,
            });

            const options = {
                hostname: 'test-payment.momo.vn',
                port: 443,
                path: '/v2/gateway/api/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
            };

            const reqMoMo = https.request(options, (resMoMo) => {
                let body = '';
                resMoMo.on('data', (chunk) => {
                    body += chunk;
                });

                resMoMo.on('end', async () => {
                    const result = JSON.parse(body);
                    console.log('MoMo API Response:', result);

                    if (result.resultCode === 0) {
                        return res.status(200).json({
                            status: 'success',
                            message: 'Redirecting to MoMo',
                            momoPaymentUrl: result.payUrl,
                        });
                    } else {
                        return res.status(500).json({
                            status: 'error',
                            message: 'MoMo payment initiation failed: ' + result.resultMessage,
                        });
                    }
                });
            });

            reqMoMo.on('error', (e) => {
                console.error(`Problem with request: ${e.message}`);
                return res.status(500).json({
                    status: 'error',
                    message: 'Internal server error while contacting MoMo',
                });
            });

            reqMoMo.write(requestBody);
            reqMoMo.end();
        } else {
            // ✅ Non-MoMo payments: Clear cart and confirm order
            await clearUserCart(userId, order.products);
            return res.status(200).json({
                status: 'success',
                message: 'Order placed successfully, pending payment.',
                data: order,
            });
        }
    } catch (error) {
        console.error('Error processing purchase:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

function formatDate(date) {
    const offset = 7; // Adjust this to your desired timezone offset (Vietnam Time is GMT+7)

    // Convert UTC to local timezone by adding offset hours
    date.setHours(date.getHours() + offset);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
}


// Function to clear the cart after purchase
// Function to clear only the cart items that are part of the order
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


//get orderdetetail by id
exports.getOrderDetailByID = async (req, res) => {
    const { orderId } = req.params;
    console.log("order id", typeof(orderId))
    try {
        const order = await Order.findById(orderId).populate('products.product').lean();

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error retrieving order:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { newStatus } = req.body;

        const order = await Order.findById(orderId).populate('products.product');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const allowedTransitions = {
            Draft: ["Pending"],
            Pending: ["Confirmed", "Cancelled"],
            Confirmed: ["Delivered"],
            Delivered: [],
            Cancelled: []
        };

        if (!allowedTransitions[order.status].includes(newStatus)) {
            return res.status(400).json({
                message: `Invalid status transition from ${order.status} to ${newStatus}`
            });
        }

        if (newStatus === "Confirmed") {
            // 🔔 Validate stock before confirming
            const insufficientStockProducts = [];

            for (const item of order.products) {
                const product = await Product.findById(item.product._id);
                if (!product) {
                    return res.status(404).json({ message: `Product ${item.product.name} not found` });
                }

                if (product.stock < item.quantity) {
                    insufficientStockProducts.push({
                        productId: product._id,
                        productName: product.name,
                        availableStock: product.stock,
                        requiredQuantity: item.quantity,
                    });
                }
            }

            if (insufficientStockProducts.length > 0) {
                return res.status(400).json({
                    message: "Cannot confirm order. Some products have insufficient stock.",
                    insufficientStockProducts
                });
            }

            // ✅ Reduce stock since all products have enough stock
            for (const item of order.products) {
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: -item.quantity }
                });
            }
        }

        // ✅ Update order status and history
        order.status = newStatus;

        if (newStatus === "Delivered") {
            order.DeliveredAt = new Date();
        }

        order.history.push({ action: `Order is ${newStatus}`, date: formatDate(new Date()) });

        await order.save();

        // 📢 Emit event via Socket.IO so frontend gets real-time update
        const io = req.app.locals.io;  // Get io instance
        io.emit("orderStatusUpdated", {
            orderId: order._id,
            newStatus,
            updatedAt: new Date(),
        });

        res.status(200).json({ message: `Order status updated to ${newStatus}`, order });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;  // Assuming userId is set by auth middleware
        const { reason } = req.body;     // Get reason from frontend

        console.log("Order ID:", id);
        console.log("User ID:", userId);
        console.log("Cancellation Reason:", reason);

        // Find the order belonging to the user
        const order = await Order.findOne({ _id: id, user: userId }).populate('user');


        console.log(order);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Only allow cancellation if status is Draft or Pending
        if (!['Draft', 'Pending'].includes(order.status)) {
            return res.status(400).json({ message: "Order cannot be canceled at this stage" });
        }

        // Update order status and reason
        order.status = "Cancelled";
        order.cancellationReason = reason;
        order.history.push({
            action: `Order cancelled - Reason: ${reason}`,
            date:  formatDate(new Date())
        });

        // If payment was Momo or Bank Transfer, mark refund as "Pending"
        if (['momo', 'BankTransfer'].includes(order.PaymentMethod)) {
            order.refundStatus = "Pending";  // Start refund process
        }

        await order.save();
        if (order.PaymentMethod === 'cod') {
            await sendCancellationEmail(order.user.email, order._id);
        }

        res.status(200).json({
            message: "Order cancelled successfully",
            refundRequired: ['momo', 'BankTransfer'].includes(order.PaymentMethod),  // Tell frontend to redirect to refund page
            order
        });

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.submitRefundBankDetails = async (req, res) => {
    try {
        const { id } = req.params;  // Order ID
        const userId = req.user.userId;  // Assuming user is authenticated


        console.log("Order ID:", id);
        console.log("User ID:", userId);
        const { bankName, accountNumber, accountHolderName } = req.body;

        console.log("req", req.body)


        // Validate input (basic)
        if (!bankName || !accountNumber || !accountHolderName) {
            return res.status(400).json({ message: "All bank details are required" });
        }

        // Find order
        const order = await Order.findOne({ _id: id, user: userId });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if the order is cancelled and refund is pending
        if (order.status !== 'Cancelled' || order.refundStatus !== 'Pending') {
            return res.status(400).json({ message: "Refund details can only be submitted for cancelled orders with pending refund" });
        }

        // Save bank details
        order.refundInfo = {
            bankName,
            accountNumber,
            accountName:accountHolderName
        };

        // Optionally update refundStatus if needed (optional, you can remove this if you have other logic to process refunds)

        await order.save();

        res.status(200).json({ message: "Refund bank details submitted successfully", order });

    } catch (error) {
        console.error("Error submitting refund bank details:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
