const Order = require("../models/Order");
const User = require('../models/user');
const Product = require('../models/products');
const jwt = require ('jsonwebtoken');
const { hash, verifyPassword } = require('../utils/hash');  // Import password utility
const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');  // Import JWT generation utility
const { v4: uuidv4 } = require('uuid');
const Review =  require('../models/reviewSchema');
// Get Monthly Revenue
const getMonthlyRevenue = async (req, res) => {
    try {
        const revenueData = await Order.aggregate([
            {
                $match: { payingStatus: "Paid" }
            },
            {
                $group: {
                    _id: { $month: { $toDate: "$createdAt" } },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const formattedRevenue = months.map((month, index) => {
            const data = revenueData.find(item => item._id === index + 1);
            return { month, revenue: data ? data.revenue : 0 };
        });

        res.status(200).json({ monthlyRevenue: formattedRevenue });
    } catch (error) {
        console.error("Error fetching revenue:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Total Sales for Each Product Type
const getProductTypeSales = async (req, res) => {
    try {
        const salesData = await Order.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.type",
                    value: { $sum: "$products.quantity" }
                }
            }
        ]);

        const formattedSales = salesData.map((item) => ({
            name: item._id,
            value: item.value
        }));

        res.status(200).json(formattedSales);

    } catch (error) {
        console.error("Error fetching product type sales:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Most Bought Product in Each Type
const getMostProductBuyEachType = async (req, res) => {
    try {
        const mostBoughtProducts = await Order.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: { type: "$productDetails.type", product: "$productDetails.name" },
                    totalSold: { $sum: "$products.quantity" }
                }
            },
            {
                $sort: { "_id.type": 1, totalSold: -1 } // Sort by type, then by quantity (desc)
            },
            {
                $group: {
                    _id: "$_id.type",
                    mostBoughtProduct: { $first: "$_id.product" },
                    totalSold: { $first: "$totalSold" }
                }
            }
        ]);

        const formattedData = mostBoughtProducts.map((item) => ({
            type: item._id,
            mostBoughtProduct: item.mostBoughtProduct,
            totalSold: item.totalSold
        }));

        res.status(200).json({ mostProductBuyEachType: formattedData });
    } catch (error) {
        console.error("Error fetching most bought products:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: { $ne: 'Draft' } }) // Exclude 'Draft' status
            .populate({
                path: 'user',
                select: 'name avatar' // Fetch only name and avatar from user
            })
            .populate({
                path: 'products.product',
                select: 'name price' // Fetch product details if needed
            });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Update a product
const updateProduct = async (req, res) => {
    try {
        const { productID, _id, ...updateData } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Internal server error" });
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
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
        });

        const previousMonthOrders = await Order.find({
            payingStatus: "Paid",
            createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd }
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
            status: { $nin: ["Draft", "Cancelled"] },
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
        });

        const previousMonthOrders = await Order.find({
            status: { $nin: ["Draft", "Cancelled"] },
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
            {
                $group: {
                    _id: "$productID",
                    averageRating: { $avg: "$rating" },
                    numberOfReviews: { $sum: 1 }
                }
            },
            {
                $sort: {
                    averageRating: -1,
                    numberOfReviews: -1
                }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "products", // Collection name (case sensitive)
                    let: { reviewProductID: { $toString: "$_id" } },  // Convert Review productID (Number) to String
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$productID", "$$reviewProductID"] }  // Match to product.productID
                            }
                        }
                    ],
                    as: "product"
                }
            },
            {
                $unwind: "$product"
            },
            {
                $project: {
                    _id: "$product._id",
                    productID: "$product.productID",
                    name: "$product.name",
                    averageRating: 1,
                    numberOfReviews: 1,
                    brand: "$product.brand",
                    price: "$product.price",
                    MainImage: "$product.MainImage"
                }
            }
        ]);

        res.status(200).json({
            message: "Top 10 rated products fetched successfully",
            data: topProducts
        });

    } catch (error) {
        console.error("Error fetching top rated products:", error);
        res.status(500).json({
            message: "Server error while fetching top rated products",
            error: error.message
        });
    }
};


module.exports = {
    getOrderComparison,
    getRevenueComparison,
    getMonthlyRevenue,
    getTopRatedProducts,
    getProductTypeSales,
    getMostProductBuyEachType,
    getAllOrders,
    updateProduct,
    loginAdmin,
};
