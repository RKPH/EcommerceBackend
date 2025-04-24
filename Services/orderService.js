const Order = require('../models/Order');
const Product = require('../models/products');
const Cart = require('../models/cart');
const mongoose = require('mongoose')
const crypto = require('crypto');
const https = require('https');
const { sendCancellationEmail, sendRefundRequestEmail, sendRefundSuccessEmail, sendRefundFailedEmail } = require('../Services/Email');
const Review = require('../models/reviewSchema');
const { v4: uuidv4 } = require('uuid');
const axios = require ('axios')

const formatDate = (date) => {
    const offset = 7; // Vietnam Time GMT+7
    date.setHours(date.getHours() + offset);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${hours}:${minutes}:${seconds},${month}/${day}/${year}`;
};

const getUTCMonthRange = (year, month) => {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    return { start, end };
};

exports.createOrder = async ({ userId, products, shippingAddress, PaymentMethod }) => {
    if (!products || !products.length) {
        throw new Error('Order must include at least one product');
    }

    // Get the total count of existing orders
    const orderCount = await Order.countDocuments();
    const order_id = (orderCount + 1).toString().padStart(4, '0');

    const existingOrder = await Order.findOne({ user: userId, status: 'Draft' });

    if (existingOrder) {
        const isSameOrder = existingOrder.products.length === products.length &&
            existingOrder.products.every((existingProduct) =>
                products.some(
                    (newProduct) =>
                        newProduct.product === existingProduct.product.toString() &&
                        newProduct.quantity === existingProduct.quantity
                )
            );

        if (!isSameOrder) {
            existingOrder.products = products.map((item) => ({
                product: item.product,
                quantity: item.quantity,
            }));
            existingOrder.shippingAddress = shippingAddress;
            existingOrder.PaymentMethod = PaymentMethod;
            await existingOrder.save();
            return { order: existingOrder, isUpdated: true };
        }
        return { order: existingOrder, isUpdated: false };
    }

    const newOrder = new Order({
        user: userId,
        order_id,
        products: products.map((item) => ({
            product: item.product,
            quantity: item.quantity,
        })),
        shippingAddress,
        PaymentMethod,
        createdAt: new Date(),
        DeliveredAt: null,
        status: 'Draft',
        history: [],
    });

    const savedOrder = await newOrder.save();
    return { order: savedOrder, isUpdated: false };
};

exports.getAllOrders = async ({ page = 1, limit = 10, search, status, PaymentMethod, payingStatus }) => {
    try {
        // Validate inputs
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new Error('Invalid page number');
        }
        if (isNaN(limitNum) || limitNum < 1) {
            throw new Error('Invalid limit value');
        }

        // Build the initial match stage (without user.name for now)
        let initialMatchStage = { status: { $ne: 'Draft' } };

        // Add status filter
        if (status && status !== 'All' && status !== 'Draft') {
            const validStatuses = ['Pending', 'Confirmed', 'Delivering' ,'Delivered', 'Cancelled', 'CancelledByAdmin'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
            }
            initialMatchStage.status = status;
        }

        // Add PaymentMethod filter
        if (PaymentMethod) {
            initialMatchStage.PaymentMethod = PaymentMethod;
        }

        // Add payingStatus filter
        if (payingStatus) {
            const validPayingStatuses = ['Paid', 'Unpaid', 'Failed'];
            if (!validPayingStatuses.includes(payingStatus)) {
                throw new Error(`Invalid payingStatus value. Must be one of: ${validPayingStatuses.join(', ')}`);
            }
            initialMatchStage.payingStatus = payingStatus;
        }

        // Add _id filter if search is a valid ObjectId
        if (search && mongoose.isValidObjectId(search)) {
            initialMatchStage._id = new mongoose.Types.ObjectId(search);
        }

        // Pipeline to get total unique orders
        const totalOrdersPipeline = [
            { $match: initialMatchStage },
            { $group: { _id: null, total: { $sum: 1 } } }
        ];

        const totalOrdersResult = await Order.aggregate(totalOrdersPipeline);
        const totalOrders = totalOrdersResult[0]?.total || 0;

        // Pipeline to fetch paginated orders
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            // Initial match (without user.name)
            { $match: initialMatchStage },

            // Lookup user
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

            // Add user.name filter after lookup (if search is provided and not an ObjectId)
            ...(search && !mongoose.isValidObjectId(search)
                ? [
                    {
                        $match: {
                            'user.name': { $regex: search, $options: 'i' }
                        }
                    }
                ]
                : []),

            // Sort early to ensure consistent order before pagination
            { $sort: { createdAt: -1 } },

            // Paginate unique orders
            { $skip: skip },
            { $limit: limitNum },

            // Lookup products
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productsDetails'
                }
            },

            // Transform the products array to match the original structure
            {
                $addFields: {
                    products: {
                        $map: {
                            input: '$products',
                            as: 'prod',
                            in: {
                                $mergeObjects: [
                                    '$$prod',
                                    {
                                        product: {
                                            $arrayElemAt: [
                                                '$productsDetails',
                                                {
                                                    $indexOfArray: ['$productsDetails._id', '$$prod.product']
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            // Remove temporary productsDetails field
            { $project: { productsDetails: 0 } }
        ];

        const orders = await Order.aggregate(pipeline);

        return {
            orders,
            totalOrders,
            pagination: {
                totalItems: totalOrders,
                totalPages: Math.ceil(totalOrders / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            }
        };
    } catch (error) {
        console.error('Error fetching orders:', error.message, error.stack);
        throw error;
    }
};

exports.getOrdersDetail = async (userId) => {
    const orders = await Order.find({ user: userId })
        .populate('products.product')
        .sort({ createdAt: -1 });
    return orders;
};

exports.purchaseOrder = async ({ userId, orderId, shippingAddress, phone, shippingFee ,deliverAt, paymentMethod, totalPrice }) => {
        const order = await Order.findOne({order_id:orderId}).populate('products.product');
        if (!order) throw new Error('No pending order found');
        console.log("shhipping fee" , shippingFee);
    if (!totalPrice || totalPrice <= 0) {
        throw new Error('Invalid total price');
    }

    order.shippingAddress = shippingAddress;
    order.phoneNumber = phone;
    order.shippingFee = shippingFee;
    order.PaymentMethod = paymentMethod;
    order.createdAt = new Date();
    order.DeliveredAt = deliverAt;
    order.totalPrice = totalPrice;

    if (paymentMethod === 'momo') {
        order.status = 'Draft';
        order.payingStatus = 'Unpaid';

        try {
            const payUrl = await exports.createMoMoPayment({ orderId, totalPrice });
            order.paymentUrl = payUrl; // Store the payment URL in the order
        } catch (error) {
            console.error(`MoMo payment initiation failed for order ${orderId}:`, error.message);
            throw new Error(`MoMo payment initiation failed: ${error.message}`);
        }
    }
    else if(paymentMethod === 'payos') {
        order.status = 'Draft';
        order.payingStatus = 'Unpaid';

        try {
            const payUrl = await exports.createPayOSPayment({ orderId, totalPrice });
            order.paymentUrl = payUrl; // Store the payment URL in the order
        } catch (error) {
            console.error(`Payos payment initiation failed for order ${orderId}:`, error.message);
            throw new Error(`Payos payment initiation failed: ${error.message}`);
        }
    }
    else {
        order.status = 'Pending';
        order.payingStatus = 'Unpaid';
    }

    if (order.PaymentMethod === 'cod') {
        order.history.push({
            date: formatDate(new Date()),
            action: 'Order placed and pending processing.',
        });
    }

    await order.save();

    if (paymentMethod !== 'momo' || paymentMethod !=='payos') {
        await clearUserCart(userId, order.products);
    }

    return order;
};

exports.createMoMoPayment = async ({ orderId, totalPrice }) => {
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const partnerCode = 'MOMO';
    const redirectUrl = `http://localhost:5173/checkout/result/${orderId}`;
    const ipnUrl = 'https://cool-wombats-exist.loca.lt/api/v1/webhook/momo-ipn';
    const orderInfo = 'pay with MoMo';
    const Totalprice = 10000; // Fixed: Use totalPrice instead of hardcoding
    const requestId = `${orderId}-${Date.now()}`;
    const extraData = '';

    // Make orderId unique by appending a timestamp
    const uniqueOrderId = `${orderId}-${Date.now()}`;

    // Validate inputs
    if (!orderId || !totalPrice || totalPrice <= 0) {
        throw new Error('Invalid orderId or totalPrice');
    }

    const rawSignature = `accessKey=${accessKey}&amount=${Totalprice}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${uniqueOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=payWithMethod`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const requestBody = JSON.stringify({
        partnerCode,
        partnerName: 'Test',
        storeId: 'MomoTestStore',
        requestId,
        amount: Totalprice,
        orderId: uniqueOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang: 'vi',
        requestType: 'payWithMethod',
        autoCapture: true,
        extraData,
        signature,
    });

    console.log('MoMo Request Body:', requestBody); // Log the request for debugging

    return new Promise((resolve, reject) => {
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
            resMoMo.on('data', (chunk) => (body += chunk));
            resMoMo.on('end', () => {
                console.log('MoMo Response Body:', body); // Log the response for debugging
                try {
                    const result = JSON.parse(body);
                    if (result.resultCode === 0) {
                        resolve(result.payUrl);
                    } else {
                        reject(new Error(`MoMo payment initiation failed: ${result.resultMessage || 'Unknown error'}`));
                    }
                } catch (parseError) {
                    reject(new Error(`Failed to parse MoMo response: ${parseError.message}, Raw response: ${body}`));
                }
            });
        });

        reqMoMo.on('error', (e) => {
            console.error('MoMo Request Error:', e.message);
            reject(new Error(`Internal server error while contacting MoMo: ${e.message}`));
        });

        reqMoMo.write(requestBody);
        reqMoMo.end();
    });
};

exports.createPayOSPayment = async ({ orderId, totalPrice }) => {
    const PAYOS_API_URL = 'https://api-merchant.payos.vn/v2/payment-requests';
    const PAYOS_API_KEY = 'b6585e6d-b4ad-4cdf-a6e9-3fbcab7b1293'; // Replace with your PayOS API key
    const PAYOS_CLIENT_ID = '6feea606-7770-4745-bcc0-61d11ec77dff'; // Replace with your PayOS client ID
    const PAYOS_CHECKSUM_KEY = '21cf69f90ea459a7c2fee82d41402465223fdb990c7c26764436f2f28c66658d'; // Replace with your PayOS checksum key

    const orderCode = parseInt(`${orderId}-${Date.now()}`); // Unique order code
    const returnUrl = `https://d2f.io.vn/checkout/result/${orderId}`;
    const cancelUrl = `https://d2f.io.vn/checkout/result/${orderId}`;
    const description = `order is ready`;

    console.log("code", orderCode)

    const paymentData = {
        orderCode: orderCode,
        amount: 10000,
        description: description,
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        clientId: PAYOS_CLIENT_ID,
        signature: ''
    };

    // Create signature
    const rawSignature = `amount=${paymentData.amount}&cancelUrl=${paymentData.cancelUrl}&description=${paymentData.description}&orderCode=${paymentData.orderCode}&returnUrl=${paymentData.returnUrl}`;
    const signature = crypto.createHmac('sha256', PAYOS_CHECKSUM_KEY)
        .update(rawSignature)
        .digest('hex');
    paymentData.signature = signature;

    try {
        const response = await axios.post(PAYOS_API_URL, paymentData, {
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log("re: ",response.data);
        if (response.data.code === '00') {
            return response.data.data.checkoutUrl;
        } else {
            throw new Error(`PayOS payment initiation failed: ${response.data.desc}`);
        }
    } catch (error) {
        console.error('PayOS Request Error:', error.message);
        throw new Error(`PayOS payment initiation failed: ${error.message}`);
    }
};


const clearUserCart = async (userId, productsInOrder) => {
    const productIdsInOrder = productsInOrder.map((item) => item.product);
    const result = await Cart.deleteMany({ user: userId, product: { $in: productIdsInOrder } });
    return result.deletedCount > 0;
};

exports.getOrderDetailByID = async (orderId) => {
    const order = await Order.findOne({order_id: orderId}).populate('products.product').lean();
    if (!order) throw new Error('Order not found');
    return order;
};


exports.updateOrderStatus = async ({ orderId, newStatus, cancellationReason }) => {

    const validStatuses = ['Draft', 'Pending', 'Confirmed', 'Delivering', 'Delivered', 'Cancelled', 'CancelledByAdmin'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findOne({ order_id: orderId }).populate('products.product').populate('user', 'name email');
    if (!order) {
        throw new Error("Order not found");
    }

    const allowedTransitions = {
        Draft: ["Pending"],
        Pending: ["Confirmed", "Cancelled", "CancelledByAdmin"],
        Confirmed: ["Delivering", "Cancelled", "CancelledByAdmin"],
        Delivering: ["Delivered"],
        Delivered: [],
        Cancelled: [],
        CancelledByAdmin: []
    };

    if (!allowedTransitions[order.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    if (newStatus === "Cancelled" || newStatus === "CancelledByAdmin") {
        if (!cancellationReason || !cancellationReason.trim()) {
            throw new Error("Cancellation reason is required when cancelling an order");
        }

        if (order.status === "Confirmed") {
            for (const item of order.products) {
                const product = await Product.findById(item.product._id);
                if (!product) {
                    throw new Error(`Product ${item.product.name} not found`);
                }
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: item.quantity }
                });
            }
        }
    }

    if (newStatus === "Confirmed") {
        const insufficientStockProducts = [];
        for (const item of order.products) {
            const product = await Product.findById(item.product._id);
            if (!product) {
                throw new Error(`Product ${item.product.name} not found`);
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
            throw new Error("Cannot confirm order. Some products have insufficient stock.", { insufficientStockProducts });
        }
        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: -item.quantity }
            });
        }
    }

    order.status = newStatus;



    if (newStatus === "Delivered") {
        order.DeliveredAt = new Date();
    }

    if (newStatus === "Cancelled" || newStatus === "CancelledByAdmin") {
        order.cancellationReason = cancellationReason;
    }

    const actionText =
        newStatus === "Confirmed" ? "Order is confirmed" :
        newStatus === "Delivering" ? "Order is out for delivery" :
        newStatus === "Delivered" ? "Order is delivered successfully" :
        newStatus === "Cancelled" ? "Order is cancelled" :
        newStatus === "CancelledByAdmin" ? "Order is cancelled by Admin" :
        `Order is ${newStatus}`;

    order.history.push({
        action: actionText,
        date: formatDate(new Date())
    });

    // Send refund request email if cancelled by admin and order is paid
    let emailSent = true;
    if (newStatus === "CancelledByAdmin" && order.user && order.user.email && order.payingStatus === "Paid") {
        emailSent = await sendRefundRequestEmail(order.user.email, orderId, cancellationReason);
        if (!emailSent) {
            console.error("Failed to send refund request email to:", order.user.email);
        }
    }

    await order.save();

    return { order, emailSent };
};


exports.getOrdersWithRefundRequests = async ({ page = 1, limit = 10, search, refundStatus = 'All' }) => {
    try {
        // Validate inputs
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new Error('Invalid page number');
        }
        if (isNaN(limitNum) || limitNum < 1) {
            throw new Error('Invalid limit value');
        }

        // Define valid refund statuses
        const validRefundStatuses = ['NotInitiated', 'Pending', 'Processing', 'Completed', 'Failed'];

        // Validate refundStatus
        if (refundStatus && refundStatus !== 'All' && !validRefundStatuses.includes(refundStatus)) {
            throw new Error(`Invalid refundStatus value. Must be one of: All, ${validRefundStatuses.join(', ')}`);
        }

        // Build the initial match stage
        let initialMatchStage = {
            status: 'Cancelled', // Refund requests are only for cancelled orders
            payingStatus: 'Paid' // Refund requests require paid orders
        };

        // Include refundStatus filter only if a specific status is provided
        if (refundStatus && refundStatus !== 'All') {
            initialMatchStage.refundStatus = refundStatus;
        }
        // Note: No refundStatus filter when refundStatus='All' or not provided, so all Cancelled and Paid orders are included

        // Add order_id filter if search is provided
        if (search) {
            initialMatchStage.order_id = search; // Exact match for order_id
        }

        // Pipeline to get total unique orders with refund requests
        const totalOrdersPipeline = [
            { $match: initialMatchStage },
            { $group: { _id: null, total: { $sum: 1 } } }
        ];

        const totalOrdersResult = await Order.aggregate(totalOrdersPipeline);
        const totalOrders = totalOrdersResult[0]?.total || 0;

        // Pipeline to fetch paginated orders
        const skip = (pageNum - 1) * limitNum;

        const pipeline = [
            // Initial match
            { $match: initialMatchStage },

            // Lookup user
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

            // Add user.name filter after lookup (if search is provided and not an order_id)
            ...(search && !initialMatchStage.order_id
                ? [
                    {
                        $match: {
                            'user.name': { $regex: search, $options: 'i' }
                        }
                    }
                ]
                : []),

            // Sort by createdAt (descending)
            { $sort: { createdAt: -1 } },

            // Paginate
            { $skip: skip },
            { $limit: limitNum },

            // Lookup products
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productsDetails'
                }
            },

            // Transform the products array
            {
                $addFields: {
                    products: {
                        $map: {
                            input: '$products',
                            as: 'prod',
                            in: {
                                $mergeObjects: [
                                    '$$prod',
                                    {
                                        product: {
                                            $arrayElemAt: [
                                                '$productsDetails',
                                                {
                                                    $indexOfArray: ['$productsDetails._id', '$$prod.product']
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },

            // Remove temporary productsDetails field
            { $project: { productsDetails: 0 } }
        ];

        const orders = await Order.aggregate(pipeline);

        return {
            success: true,
            orders,
            totalOrders,
            pagination: {
                totalItems: totalOrders,
                totalPages: Math.ceil(totalOrders / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            }
        };
    } catch (error) {
        console.error('Error fetching orders with refund requests:', error.message, error.stack);
        throw error;
    }
};

exports.cancelOrder = async ({ orderId, userId, reason }) => {
    const order = await Order.findOne({ order_id: orderId, user: userId }).populate('user');
    if (!order) throw new Error('Order not found');
    if (!['Draft', 'Pending'].includes(order.status)) {
        throw new Error('Order cannot be canceled at this stage');
    }

    order.status = 'Cancelled';
    order.cancellationReason = reason;
    order.history.push({ action: `Order cancelled - Reason: ${reason}`, date: formatDate(new Date()) });

    if (['momo', 'payos'].includes(order.PaymentMethod)) {
        order.refundStatus = 'Pending';
    }

    await order.save();
    if (order.PaymentMethod === 'cod') {
        await sendCancellationEmail(order.user.email, order._id);
    }

    return order;
};

exports.submitRefundBankDetails = async ({ orderId, userId, bankName, accountNumber, accountHolderName }) => {
    if (!bankName || !accountNumber || !accountHolderName) {
        throw new Error('All bank details are required');
    }
    console.log(accountNumber, accountHolderName);
    const order = await Order.findOne({ order_id: orderId, user: userId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'Cancelled' || order.refundStatus !== 'Pending') {
        throw new Error('Refund details can only be submitted for cancelled orders with pending refund');
    }

    order.refundInfo = { bankName, accountNumber, accountName: accountHolderName };
    await order.save();
    return order;
};

exports.getOrderDetails = async (orderId) => {


    const order = await Order.findOne({order_id: orderId })
        .populate("user", "name avatar email")
        .populate("products.product", "name price MainImage");

    if (!order) {
        console.log("not found")
        throw new Error("Order not found");
    }

    const formattedOrder = {
        ...order._doc,
        history: order.history.map((entry) => ({
            ...entry._doc,
            date: entry.date,
        })),
    };

    return formattedOrder;
};

exports.updatePaymentStatus = async ({ orderId, payingStatus }) => {
    if (!payingStatus || !["Paid", "Unpaid", "Failed"].includes(payingStatus)) {
        throw new Error("Invalid payingStatus value. Must be 'Paid', 'Unpaid', or 'Failed'.");
    }

    const updateData = { payingStatus };
    if (payingStatus === "Paid") {
        updateData.PaidAt = new Date();
    }

    const updatedOrder = await Order.findOneAndUpdate(
        {order_id:orderId},
        { $set: updateData },
        { new: true, runValidators: true }
    );

    if (!updatedOrder) {
        throw new Error("Order not found");
    }

    return updatedOrder;
};

exports.updateRefundStatus = async ({ orderId, refundStatus }) => {
    if (!refundStatus || !["NotInitiated", "Pending", "Processing", "Completed", "Failed"].includes(refundStatus)) {
        throw new Error("Invalid refundStatus value. Must be 'NotInitiated', 'Pending', 'Processing', 'Completed', or 'Failed'.");
    }

   
    const order = await Order.findOne({order_id:orderId}).populate("user", "email");
    if (!order) {
        throw new Error("Order not found");
    }

    if (order.status !== "Cancelled" || order.payingStatus !== "Paid") {
        throw new Error("Refund can only be processed for cancelled and paid orders");
    }

    const updatedOrder = await Order.findOneAndUpdate(
        { order_id: orderId },
        { $set: { refundStatus } },
        { new: true, runValidators: true }
    )

    let emailSent = true;
    const userEmail = order.user.email;

    if (refundStatus === "Completed") {
        emailSent = await sendRefundSuccessEmail(userEmail, orderId);
    } else if (refundStatus === "Failed") {
        emailSent = await sendRefundFailedEmail(userEmail, orderId);
    }

    return { updatedOrder, emailSent };
};

exports.getMonthlyRevenue = async () => {
    try {
        const currentYear = new Date().getFullYear();

        const revenueData = await Order.aggregate([
            {
                $match: {
                    payingStatus: "Paid",
                    status: { $nin: ["Cancelled", "CancelledByAdmin"] },
                    refundStatus: { $ne: "Completed" },
                    PaidAt: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: { $toDate: "$PaidAt" } },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const formattedRevenue = months.map((month, index) => {
            const data = revenueData.find(item => item._id === index + 1);
            return { month, revenue: data ? data.revenue : 0 };
        });

        const range = `Jan ${currentYear} - Dec ${currentYear}`;

        return { monthlyRevenue: formattedRevenue, range };
    } catch (error) {
        console.error("Error fetching monthly revenue:", error);
        throw new Error("Internal server error");
    }
};

exports.getWeeklyRevenue = async () => {
    try {
        const now = new Date();
        const vietnamOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
        const vietnamNow = new Date(now.getTime() + vietnamOffset);

        const currentDay = vietnamNow.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust to Monday start
        const startOfWeek = new Date(vietnamNow);
        startOfWeek.setUTCDate(vietnamNow.getUTCDate() - daysSinceMonday);
        startOfWeek.setUTCHours(0, 0, 0, 0); // Midnight Vietnam time
        const startOfWeekUTC = new Date(startOfWeek.getTime() - vietnamOffset); // Convert to UTC

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
        endOfWeek.setUTCHours(23, 59, 59, 999); // End of Sunday Vietnam time
        const endOfWeekUTC = new Date(endOfWeek.getTime() - vietnamOffset); // Convert to UTC

        const revenueData = await Order.aggregate([
            {
                $match: {
                    payingStatus: "Paid",
                    status: { $nin: ["Cancelled", "CancelledByAdmin"] },
                    refundStatus: { $ne: "Completed" },
                    PaidAt: { $gte: startOfWeekUTC, $lte: endOfWeekUTC }
                }
            },
            {
                $project: {
                    totalPrice: 1,
                    vietnamPaidAt: { $add: ["$PaidAt", vietnamOffset] }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$vietnamPaidAt" },
                    revenue: { $sum: "$totalPrice" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const formattedRevenue = days.map((day, index) => {
            const dayIndex = (index + 2 <= 7 ? index + 2 : 1); // Mon=2, ..., Sun=1
            const data = revenueData.find(item => item._id === dayIndex);
            return { day, revenue: data ? data.revenue : 0 };
        });

        const start_date_str = startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
        const end_date_str = endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
        const weekDateRange = `${start_date_str} - ${end_date_str}`;

        return { weekDateRange, weeklyRevenue: formattedRevenue };
    } catch (error) {
        console.error("Error fetching weekly revenue:", error);
        throw new Error("Internal server error");
    }
};

exports.getProductTypeSales = async () => {
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

        return formattedSales;
    } catch (error) {
        console.error("Error fetching product type sales:", error);
        throw new Error("Internal server error");
    }
};

exports.getMostProductBuyEachType = async () => {
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

        return { mostProductBuyEachType: formattedData };
    } catch (error) {
        console.error("Error fetching most bought products:", error);
        throw new Error("Internal server error");
    }
};

exports.getRevenueComparison = async () => {
    try {
        const now = new Date();

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

        return {
            currentMonthRevenue: currentRevenue,
            previousMonthRevenue: previousRevenue,
            percentageChange: percentageChange.toFixed(2) + "%"
        };
    } catch (error) {
        console.error("Error fetching revenue comparison:", error);
        throw new Error("Failed to fetch revenue comparison");
    }
};

exports.getOrderComparison = async () => {
    try {
        const now = new Date();

        const { start: currentMonthStart, end: currentMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth());
        const { start: previousMonthStart, end: previousMonthEnd } = getUTCMonthRange(now.getUTCFullYear(), now.getUTCMonth() - 1);

        console.log("Current Month (UTC):", currentMonthStart, "to", currentMonthEnd);
        console.log("Previous Month (UTC):", previousMonthStart, "to", previousMonthEnd);

        const currentMonthOrders = await Order.find({
            status: { $nin: ["Draft", "Cancelled", "CancelledByAdmin"] },
            createdAt: { $gte: currentMonthStart, $lt: currentMonthEnd }
        });

        const previousMonthOrders = await Order.find({
            status: { $nin: ["Draft", "Cancelled", "CancelledByAdmin"] },
            createdAt: { $gte: previousMonthStart, $lt: previousMonthEnd }
        });

        const currentOrderCount = currentMonthOrders.length;
        const previousOrderCount = previousMonthOrders.length;

        const percentageChange = previousOrderCount === 0
            ? (currentOrderCount > 0 ? 100 : 0)
            : ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100;

        return {
            currentMonthOrders: currentOrderCount,
            previousMonthOrders: previousOrderCount,
            percentageChange: percentageChange.toFixed(2) + "%"
        };
    } catch (error) {
        console.error("Error fetching order comparison:", error);
        throw new Error("Failed to fetch order comparison");
    }
};

exports.getTopRatedProducts = async () => {
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
            // Step 3: Limit to top 5 products
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

        return topProducts;
    } catch (error) {
        console.error("Error fetching top rated products:", error);
        throw new Error("Failed to fetch top rated products");
    }
};

exports.getTopOrderedProducts = async ({ category = 'All' }) => {
    try {
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
                    productID: { $first: '$products.productID' },
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
        return topProducts;
    } catch (error) {
        console.error('Error fetching top ordered products:', error);
        throw new Error('Failed to fetch top ordered products');
    }
};