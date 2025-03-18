    const Order = require("../models/Order");
    const User = require('../models/user');
    const Product = require('../models/products');
    const mongoose = require('mongoose');
    const jwt = require ('jsonwebtoken');
    const { hash, verifyPassword } = require('../utils/hash');  // Import password utility
    const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');  // Import JWT generation utility
    const { v4: uuidv4 } = require('uuid');

    const userService = require('../Services/userService');
    const orderService =  require('../Services/orderService');
    const Review =  require('../models/reviewSchema');
    const productService = require('../Services/productService');


    //static
    const getMonthlyRevenue = async (req, res) => {
        try {
            const { monthlyRevenue, range } = await orderService.getMonthlyRevenue();
            res.status(200).json({ monthlyRevenue, range });
        } catch (error) {
            console.error("Error fetching revenue:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };

    const getWeeklyRevenue = async (req, res) => {
        try {
            const { weekDateRange, weeklyRevenue } = await orderService.getWeeklyRevenue();
            res.status(200).json({ weekDateRange, weeklyRevenue });
        } catch (error) {
            console.error("Error fetching weekly revenue:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };

    const getProductTypeSales = async (req, res) => {
        try {
            const formattedSales = await orderService.getProductTypeSales();
            res.status(200).json(formattedSales);
        } catch (error) {
            console.error("Error fetching product type sales:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };

    const getMostProductBuyEachType = async (req, res) => {
        try {
            const { mostProductBuyEachType } = await orderService.getMostProductBuyEachType();
            res.status(200).json({ mostProductBuyEachType });
        } catch (error) {
            console.error("Error fetching most bought products:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };


    //products
    const createProduct = async (req, res) => {
        try {
            const {
                name,
                price,
                category,
                type,
                brand,
                stock,
                mainImage,
                description
            } = req.body;

            const savedProduct = await productService.createProduct({
                name,
                price,
                category,
                type,
                brand,
                stock,
                mainImage,
                description
            });

            res.status(201).json({
                success: true,
                message: 'Product created successfully.',
                data: savedProduct,
            });
        } catch (error) {
            console.error('Error creating product:', error);
            if (error.message.includes('required')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('Price') || error.message.includes('Stock')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('Validation error')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('Product ID already exists')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while creating the product.',
                error: error.message,
            });
        }
    };

    const updateProduct = async (req, res) => {
        try {
            const { productID, _id, ...updateData } = req.body;
            const product_id = req.params.id; // Lấy từ params

            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: "Product ID is required.",
                });
            }

            const updatedProduct = await productService.updateProduct(product_id, updateData);

            res.status(200).json({
                success: true,
                message: "Product updated successfully",
                product: updatedProduct,
            });
        } catch (error) {
            console.error("Error updating product:", error);
            if (error.message.includes('Invalid product ID')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                success: false,
                message: "Internal server error",
                error: error.message,
            });
        }
    };

    const deleteProduct = async (req, res) => {
        try {
            const { product_id } = req.params;

            if (!product_id) {
                return res.status(400).json({
                    success: false,
                    message: "Product ID is required.",
                });
            }

            const deletedProduct = await productService.deleteProduct(product_id);

            res.status(200).json({
                success: true,
                message: `Product with product_id ${deletedProduct.product_id} deleted successfully.`,
                data: deletedProduct,
            });
        } catch (error) {
            console.error('Error deleting product:', error);
            if (error.message.includes('Invalid product_id')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                });
            }
            if (error.message.includes('active orders')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                });
            }
            res.status(500).json({
                success: false,
                message: 'An unexpected error occurred while deleting the product.',
                error: error.message,
            });
        }
    };

    const loginAdmin = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if the user exists
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Check if the user is an admin
            if (user.role !== 'admin') {
                return res.status(403).json({ message: 'Access denied. Only admins can log in.' });
            }

            // Check if the account is verified
            if (!user.isVerified) {
                return res.status(403).json({ message: 'Account not verified. Please check your email to verify your account.' });
            }

            // Verify the password
            const isPasswordValid = verifyPassword(user.salt, user.password, password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate a JWT token
            const sessionID = uuidv4();
            const token = generateJwt(user._id, sessionID);
            const refreshToken = generateRefreshToken(user._id, sessionID);

            // Set cookies for authentication
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            // Send response
            res.status(200).json({
                message: 'Admin login successful',
                token,
                refreshToken,
                user: {
                    id: user._id,
                    sessionID: sessionID,
                    user_id: user.user_id,
                    avatar: user.avatar,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };

    const getRevenueComparison = async (req, res) => {
        try {
            const now = new Date();

            const getUTCMonthRange = (year, month) => {
                const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
                const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
                return { start, end };
            };

            const { start: currentMonthStart, end: currentMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth());
            const { start: previousMonthStart, end: previousMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);

            console.log("Current Month (UTC):", currentMonthStart, "to", currentMonthEnd);
            console.log("Previous Month (UTC):", previousMonthStart, "to", previousMonthEnd);

            const currentMonthOrders = await Order.find({
                payingStatus: "Paid",
                status: { $nin: ["Cancelled", "CancelledByAdmin"] },
                PaidAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
            });

            const previousMonthOrders = await Order.find({
                payingStatus: "Paid",
                status: { $nin: ["Cancelled", "CancelledByAdmin"] },
                PaidAt: { $gte: previousMonthStart, $lt: previousMonthEnd }
            });

            console.log("Current Month Orders:", currentMonthOrders.length);
            console.log("Previous Month Orders:", previousMonthOrders.length);

            const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
            const previousRevenue = previousMonthOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

            const percentageChange = previousRevenue === 0
                ? (currentRevenue > 0 ? 100 : 0)
                : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

            res.status(200).json({
                currentMonthRevenue: currentRevenue,
                previousMonthRevenue: previousRevenue,
                percentageChange: percentageChange.toFixed(2) + "%"
            });

        } catch (error) {
            console.error("Error fetching revenue comparison:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };
    ;

    const getOrderComparison = async (req, res) => {
        try {
            const now = new Date();

            // Utility function to get UTC month range
            const getUTCMonthRange = (year, month) => {
                const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
                const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
                return { start, end };
            };

            const { start: currentMonthStart, end: currentMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth());
            const { start: previousMonthStart, end: previousMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);

            console.log("Current Month (UTC):", currentMonthStart, "to", currentMonthEnd);
            console.log("Previous Month (UTC):", previousMonthStart, "to", previousMonthEnd);

            // Find all orders in valid statuses (excluding Draft & Cancelled) within the time range
            const currentMonthOrders = await Order.find({
                status: { $nin: ["Draft", "Cancelled" , "CancelledByAdmin"] },
                createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
            });

            const previousMonthOrders = await Order.find({
                status: { $nin: ["Draft", "Cancelled" ,"CancelledByAdmin"] },
                createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd }
            });

            const currentOrderCount = currentMonthOrders.length;
            const previousOrderCount = previousMonthOrders.length;

            const percentageChange = previousOrderCount === 0
                ? (currentOrderCount > 0 ? 100 : 0)
                : ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100;

            res.status(200).json({
                currentMonthOrders: currentOrderCount,
                previousMonthOrders: previousOrderCount,
                percentageChange: percentageChange.toFixed(2) + "%"
            });

        } catch (error) {
            console.error("Error fetching order comparison:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    };

    const getTopRatedProducts = async (req, res) => {
        try {

            const topProducts = await Review.aggregate([
                // Step 1: Group reviews by product_id to calculate average rating and count
                {
                    $group: {
                        _id: "$product_id", // product_id from Review (Number)
                        averageRating: { $avg: "$rating" },
                        numberOfReviews: { $sum: 1 }
                    }
                },
                // Step 2: Sort by average rating (descending) and number of reviews (descending)
                {
                    $sort: {
                        averageRating: -1,
                        numberOfReviews: -1
                    }
                },
                // Step 3: Limit to top 10 products
                {
                    $limit: 5
                },
                // Step 4: Join with the products collection, converting Review.product_id (Number) to String
                {
                    $lookup: {
                        from: "products", // MongoDB collection name (lowercase, case-sensitive)
                        let: { reviewProductId: { $toString: "$_id" } }, // Convert Number to String
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$product_id", "$$reviewProductId"] } // Match Product.product_id (String)
                                }
                            }
                        ],
                        as: "product"
                    }
                },
                // Step 5: Unwind the product array (since $lookup returns an array)
                {
                    $unwind: "$product"
                },
                // Step 6: Project the desired fields
                {
                    $project: {
                        _id: "$product._id",
                        product_id: "$product.product_id",
                        name: "$product.name",
                        averageRating: 1,
                        numberOfReviews: 1,
                        brand: "$product.brand",
                        price: "$product.price",
                        MainImage: "$product.MainImage",
                        stock: "$product.stock",
                        category: "$product.category",
                        type: "$product.type"
                    }
                }
            ]);

            // Step 7: Check if any products were found
            if (!topProducts.length) {
                return res.status(200).json({
                    message: "No top-rated products found.",
                    data: []
                });
            }

            res.status(200).json({
                message: "Top 10 rated products fetched successfully",
                data: topProducts
            });
        } catch (error) {
            console.error("Error fetching top rated products for admin:", error);
            res.status(500).json({
                message: "Server error while fetching top rated products",
                error: error.message
            });
        }
    };

    const getTopOrderedProductsController = async (req, res) => {
        try {
            const { category = 'All' } = req.query;

            const matchStage = category !== 'All' ? { 'products.productCategory': category } : {};

            const pipeline = [
                {
                    $unwind: '$products'
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'products.product',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                {
                    $unwind: '$productDetails'
                },
                {
                    $addFields: {
                        'products.productID': '$productDetails.productID',
                        'products.productName': '$productDetails.name',
                        'products.productCategory': '$productDetails.category',
                        'products.productBrand': '$productDetails.brand',
                        'products.productPrice': '$productDetails.price',
                        'products.productMainImage': '$productDetails.MainImage'
                    }
                },
                {
                    $match: matchStage
                },
                {
                    $group: {
                        _id: '$products.product',
                        productID: { $first: '$products.productID' },      // Added productID here
                        productName: { $first: '$products.productName' },
                        category: { $first: '$products.productCategory' },
                        brand: { $first: '$products.productBrand' },
                        price: { $first: '$products.productPrice' },
                        MainImage: { $first: '$products.productMainImage' },
                        totalOrdered: { $sum: '$products.quantity' }
                    }
                },
                {
                    $sort: { totalOrdered: -1 }
                },
                {
                    $limit: 5
                }
            ];

            const topProducts = await Order.aggregate(pipeline);

            res.status(200).json({
                success: true,
                data: topProducts
            });
        } catch (error) {
            console.error('Error fetching top ordered products:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch top ordered products',
                error: error.message
            });
        }
    };

    //admin order
    const getAllOrders = async (req, res) => {
        try {
            const { page = 1, limit = 10, search, status, PaymentMethod, payingStatus } = req.query;
            const { orders, totalOrders, pagination } = await orderService.getAllOrders({
                page,
                limit,
                search,
                status,
                PaymentMethod,
                payingStatus,
            });

            if (!orders || orders.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No orders found',
                });
            }

            res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: orders,
                pagination,
            });
        } catch (error) {
            console.error('Error fetching orders:', error.message, error.stack);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    };

    const getOrderDetails = async (req, res) => {
        try {
            const { orderId } = req.params;
            const formattedOrder = await orderService.getOrderDetails(orderId);
            res.status(200).json({
                success: true,
                data: formattedOrder,
            });
        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(error.message.includes("not found") ? 404 : 400).json({
                success: false,
                message: error.message || "Error fetching order details",
            });
        }
    };

    const updatePaymentStatus = async (req, res) => {
        try {
            const { orderId } = req.params;
            const { payingStatus } = req.body;
            const updatedOrder = await orderService.updatePaymentStatus({ orderId, payingStatus });
            res.status(200).json({
                success: true,
                message: "Payment status updated successfully",
                data: updatedOrder,
            });
        } catch (error) {
            console.error("Error updating payment status:", error);
            res.status(error.message.includes("not found") ? 404 : 400).json({
                success: false,
                message: error.message || "Server error while updating payment status",
            });
        }
    };

    const updateRefundStatus = async (req, res) => {
        try {
            const { orderId } = req.params;
            const { refundStatus } = req.body;
            const { updatedOrder, emailSent } = await orderService.updateRefundStatus({ orderId, refundStatus });

            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    message: "Refund status updated, but failed to send email notification",
                    data: updatedOrder,
                });
            }

            res.status(200).json({
                success: true,
                message: "Refund status updated successfully and email sent",
                data: updatedOrder,
            });
        } catch (error) {
            console.error("Error updating refund status:", error);
            res.status(error.message.includes("not found") ? 404 : 400).json({
                success: false,
                message: error.message || "Server error while updating refund status",
            });
        }
    };

    const updateOrderStatus = async (req, res) => {
        try {
            const { orderId } = req.params;
            const { newStatus, cancellationReason } = req.body;

            const { order: updatedOrder, emailSent } = await orderService.updateOrderStatus({
                orderId,
                newStatus,
                cancellationReason,
            });

            const io = req.app.locals.io;
            io.emit("orderStatusUpdated", {
                orderId: updatedOrder._id,
                newStatus,
                updatedAt: new Date(),
            });

            const populatedOrder = await orderService.getOrderDetails(orderId);

            res.status(200).json({
                success: true,
                message: `Order status updated to ${newStatus}`,
                order: populatedOrder,
            });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(error.message.includes("not found") ? 404 : 400).json({
                success: false,
                message: error.message || "Server error",
            });
        }
    };
    //users
    const getAllUsers = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || "";
            const role = req.query.role || "";

            const result = await userService.getAllUsers(page, limit, search, role);

            res.status(200).json({
                status: "success",
                data: result.users,
                pagination: result.pagination,
            });
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({
                status: "error",
                message: error.message || "Failed to fetch users due to a server error.",
            });
        }
    };

    const getUserDetails = async (req, res) => {
        try {
            const { id } = req.params; // user_id from the URL
            const user = await userService.getUserDetails(id);

            return res.status(200).json({
                status: 'success',
                message: 'User details retrieved successfully.',
                data: user,
            });
        } catch (error) {
            console.error('Error fetching user details:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'An unexpected error occurred while fetching user details.',
            });
        }
    };

    const updateUser = async (req, res) => {
        try {
            let { id } = req.params; // user_id from the URL (string, e.g., "570425415")
            const { name, email, avatar, password, emailVerified, role } = req.body;
            console.log("type of id" ,id)
            // Validate required fields
            if (!name || !email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name and email are required.',
                });
            }

            // Validate role
            if (role && !['customer', 'admin'].includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid role. Role must be either "customer" or "admin".',
                });
            }
            id= parseInt(id.trim(), 10);
            // Find the user by user_id (string)
            const user = await User.findOne({ user_id: id });
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found.',
                });
            }
            console.log("user ", user);
            // Check if email is being updated and ensure it's unique
            if (email && email !== user.email) {
                const emailExists = await User.findOne({ email });
                if (emailExists) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Email is already in use by another user.',
                    });
                }
            }

            // Prepare the update object
            const updateData = {
                name,
                email,
                avatar: avatar || user.avatar, // Use existing avatar if not provided
                isVerified: emailVerified !== undefined ? emailVerified : user.isVerified,
                role: role || user.role, // Use existing role if not provided
            };

            // If password is provided, hash it and update salt and password
            if (password) {
                const { salt, hashedPassword } = hash(password);
                updateData.salt = salt;
                updateData.password = hashedPassword;
            }

            // Update the user
            const updatedUser = await User.findOneAndUpdate(
                { user_id: id }, // Query with string user_id
                { $set: updateData },
                { new: true, runValidators: true } // Return the updated document and run schema validators
            );

            if (!updatedUser) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to update user.',
                });
            }

            // Respond with success
            return res.status(200).json({
                status: 'success',
                message: 'User updated successfully.',
                data: {
                    user_id: updatedUser.user_id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    avatar: updatedUser.avatar,
                    role: updatedUser.role,
                    isVerified: updatedUser.isVerified,
                },
            });
        } catch (error) {
            console.error('Error updating user:', error);

            // Handle specific errors (e.g., validation errors)
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation error.',
                    errors: Object.values(error.errors).map(err => err.message),
                });
            }

            // Handle duplicate email error (unique constraint violation)
            if (error.code === 11000 && error.keyPattern?.email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already in use by another user.',
                });
            }

            // Generic server error
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred while updating the user.',
            });
        }
    };

    const createUser = async (req, res) => {
        try {
            const { name, email, avatar, password, emailVerified, role } = req.body;

            // Validate required fields
            if (!name || !email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Name, email, and password are required.',
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid email format.',
                });
            }

            // Validate role
            if (role && !['customer', 'admin'].includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid role. Role must be either "customer" or "admin".',
                });
            }

            // Check if email already exists
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already in use by another user.',
                });
            }

            // Generate a unique user_id
            let user_id;
            let isUnique = false;
            do {
                user_id = Math.floor(100000000 + Math.random() * 900000000); // Generate a 9-digit number
                const existingUser = await User.findOne({ user_id });
                if (!existingUser) {
                    isUnique = true;
                }
            } while (!isUnique);

            // Hash the password
            const { salt, hashedPassword } = hash(password);

            // Prepare the new user data
            const newUserData = {
                user_id, // Assign the generated user_id
                name,
                email,
                avatar: avatar || '', // Default to empty string if no avatar provided
                password: hashedPassword,
                salt,
                role: role || 'customer', // Default to 'customer' if not provided
                isVerified: emailVerified !== undefined ? emailVerified : false, // Default to false if not provided
            };

            // Create the new user
            const newUser = new User(newUserData);
            const savedUser = await newUser.save();

            if (!savedUser) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to create user.',
                });
            }

            // Respond with success (exclude sensitive fields)
            return res.status(201).json({
                status: 'success',
                message: 'User created successfully.',
                data: {
                    user_id: savedUser.user_id,
                    name: savedUser.name,
                    email: savedUser.email,
                    avatar: savedUser.avatar,
                    role: savedUser.role,
                    isVerified: savedUser.isVerified,
                    createdAt: savedUser.createdAt,
                },
            });
        } catch (error) {
            console.error('Error creating user:', error);

            // Handle validation errors
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation error.',
                    errors: Object.values(error.errors).map(err => err.message),
                });
            }

            // Handle duplicate email error (unique constraint violation)
            if (error.code === 11000 && error.keyPattern?.email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already in use by another user.',
                });
            }

            // Generic server error
            return res.status(500).json({
                status: 'error',
                message: 'An unexpected error occurred while creating the user.',
            });
        }
    };


    module.exports = {
        getTopOrderedProductsController,
        getWeeklyRevenue,
        getOrderComparison,
        getRevenueComparison,
        getMonthlyRevenue,
        getTopRatedProducts,
        getProductTypeSales,
        getMostProductBuyEachType,
        getAllOrders,
        createProduct,
        updateProduct,
        deleteProduct,
        getOrderDetails,
        updatePaymentStatus,
        updateRefundStatus,
        updateOrderStatus,
        loginAdmin,
        getAllUsers,
        getUserDetails,
        updateUser,
        createUser
    };
