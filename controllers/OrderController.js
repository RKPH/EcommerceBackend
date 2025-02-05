const Order = require('../models/Order');
const Product = require("../models/products"); // Adjust the path to your Order model
const Cart = require("../models/cart");
const {isTagPresentInTags} = require("swagger-jsdoc/src/utils");


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
            status: 'Pending', // Adjust status field based on your schema
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
        const formatDate = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const year = String(date.getFullYear()).slice(-2); // Last two digits of the year

            return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
        };

        // Function for formatting date without time for createdAt and DeliveredAt
        const formatDateWithoutTime = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const year = String(date.getFullYear()); // Full year

            return `${month}/${day}/${year}`;
        };
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
            isPaid: false, // Set initial payment status
            createdAt: formatDateWithoutTime(new Date()), // Set initial creation date
            DeliveredAt: null, // Set initial delivery status
            status: 'Pending', // Set initial status
            history: [
                {
                    date: formatDate(new Date()),
                    action: 'Order created and is pending for processing.',
                }
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
        // Retrieve orders for the specific user and populate the product details
        const orders = await Order.find({ user: req.user.userId }).populate('products.product'); // Assuming 'products' is an array in the order with a reference to 'product'

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


// Purchase Order: Change status to 'Purchased' and clear the cart
exports.purchaseOrder = async (req, res) => {
    const { userId } = req.user; // Extract userId from the authenticated user
    const { orderId, deliverAt, paymentMethod, totalPrice } = req.body;
    console.log("order id", orderId)
    try {
        // 1. Find the order that is in 'Pending' status
        const order = await Order.findById(orderId).exec();

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'No pending order found',
            });
        }

        const formatDate = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
            const year = String(date.getFullYear()).slice(-2); // Last two digits of the year

            return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
        };
        // 2. Change order status to 'Purchased'
        order.status = 'Processing';
        order.history.push({date: formatDate(new Date()), action: 'Order is paid.' });
        order.isPaid = true;
        order.PaymentMethod = paymentMethod;
        order.DeliveredAt = deliverAt;
        order.totalPrice = totalPrice;
        await order.save();

        // 3. Clear the cart after purchase (assuming you have a Cart model)
        await clearUserCart(userId, order.products);

        return res.status(200).json({
            status: 'success',
            message: 'Order purchased and cart cleared successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error processing purchase:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

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


exports.updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { action } = req.body;

    try {
        console.log(`Incoming request to update order status: ${orderId}, action: ${action}`);

        // Find the order by ID
        const order = await Order.findById(orderId).exec();
        if (!order) {
            console.error(`Order with ID ${orderId} not found`);
            return res.status(404).json({
                status: 'error',
                message: 'Order not found',
            });
        }

        const formatDate = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
        };

        // Update order history
        order.history.push({ action, date: formatDate(new Date()) });
        // Save updated order

        await order.save();

        console.log(`Order updated successfully: ${orderId}`);
        return res.status(200).json({
            status: 'success',
            message: 'Order status updated successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error updating order status:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
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