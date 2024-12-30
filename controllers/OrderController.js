const Order = require('../models/Order');
const Product = require("../models/products"); // Adjust the path to your Order model

// Create Order
exports.createOrder = async (req, res) => {
    const { userId } = req.user; // Extract userId from authenticated user
    const { products, shippingAddress, PaymentMethod } = req.body;

    try {
        // Validate request
        if (!products || !products.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Order must include at least one product',
            });
        }

        // Ensure that each product in the order exists in the database
        const productsInOrder = [];
        for (let item of products) {
            // Check if each product exists by productId
            const product = await Product.findById(item.product);  // Assuming 'productId' is the field in the item
            if (!product) {
                return res.status(404).json({
                    status: 'error',
                    message: `Product with ID ${item.product} not found`,
                });
            }

            // Push the product details and quantity into the products array
            productsInOrder.push({
                product: product._id,
                quantity: item.quantity,
            });
        }

        // Create the order with the populated products
        const newOrder = new Order({
            user: userId,
            products: productsInOrder,
            shippingAddress,
            PaymentMethod,
        });

        // Save the order to the database
        const savedOrder = await newOrder.save();

        return res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            data: savedOrder,
        });
    } catch (error) {
        console.error('Error creating order:', error.message);
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
