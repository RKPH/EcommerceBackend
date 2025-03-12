const Order = require('../models/Order');
const Product = require('../models/products');
const Cart = require('../models/cart');
const User = require('../models/user');
const crypto = require('crypto');
const https = require('https');
const { sendCancellationEmail } = require('../Services/Email');

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

exports.createOrder = async ({ userId, orderID, products, shippingAddress, PaymentMethod }) => {
    if (!products || !products.length) {
        throw new Error('Order must include at least one product');
    }

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
        orderID,
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

exports.getAllOrders = async ({ page = 1, limit = 10, search, status }) => {
    let query = {};
    if (search) {
        query.$or = [
            { _id: { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
        ];
    }
    if (status && status !== 'All') {
        query.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
        .populate('products.product')
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    const totalOrders = await Order.countDocuments(query);

    return { orders, totalOrders, pageNum, limitNum };
};

exports.getOrdersDetail = async (userId) => {
    const orders = await Order.find({ user: userId })
        .populate('products.product')
        .sort({ createdAt: -1 });
    return orders;
};

exports.purchaseOrder = async ({ userId, orderId, shippingAddress, deliverAt, paymentMethod, totalPrice }) => {
    const order = await Order.findById(orderId).populate('products.product');
    if (!order) throw new Error('No pending order found');

    order.shippingAddress = shippingAddress;
    order.PaymentMethod = paymentMethod;
    order.CreatedAt = new Date();
    order.DeliveredAt = deliverAt;
    order.totalPrice = totalPrice;

    if (paymentMethod === 'momo') {
        order.status = 'Draft';
        order.payingStatus = 'Unpaid';
    } else {
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

    if (paymentMethod !== 'momo') {
        await clearUserCart(userId, order.products);
    }

    return order;
};

exports.createMoMoPayment = async ({ orderId, totalPrice }) => {
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const partnerCode = 'MOMO';
    const redirectUrl = `http://localhost:5173/checkout/success/${orderId}`;
    const ipnUrl = 'https://funny-ways-open.loca.lt/api/v1/webhook/momo-ipn';
    const orderInfo = 'pay with MoMo';
    const requestId = `${orderId}-${Date.now()}`;
    const extraData = '';
    const rawSignature = `accessKey=${accessKey}&amount=${totalPrice}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=payWithMethod`;
    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const requestBody = JSON.stringify({
        partnerCode,
        partnerName: 'Test',
        storeId: 'MomoTestStore',
        requestId,
        amount: totalPrice,
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
                const result = JSON.parse(body);
                if (result.resultCode === 0) {
                    resolve(result.payUrl);
                } else {
                    reject(new Error('MoMo payment initiation failed: ' + result.resultMessage));
                }
            });
        });

        reqMoMo.on('error', (e) => reject(new Error('Internal server error while contacting MoMo: ' + e.message)));
        reqMoMo.write(requestBody);
        reqMoMo.end();
    });
};

const clearUserCart = async (userId, productsInOrder) => {
    const productIdsInOrder = productsInOrder.map(item => item.product);
    const result = await Cart.deleteMany({ user: userId, product: { $in: productIdsInOrder } });
    return result.deletedCount > 0;
};

exports.getOrderDetailByID = async (orderId) => {
    const order = await Order.findById(orderId).populate('products.product').lean();
    if (!order) throw new Error('Order not found');
    return order;
};

exports.updateOrderStatus = async ({ orderId, newStatus }) => {
    const order = await Order.findById(orderId).populate('products.product');
    if (!order) throw new Error('Order not found');

    const allowedTransitions = {
        Draft: ['Pending'],
        Pending: ['Confirmed', 'Cancelled'],
        Confirmed: ['Delivered'],
        Delivered: [],
        Cancelled: [],
    };

    if (!allowedTransitions[order.status].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
    }

    if (newStatus === 'Confirmed') {
        const insufficientStockProducts = [];
        for (const item of order.products) {
            const product = await Product.findById(item.product._id);
            if (!product) throw new Error(`Product ${item.product.name} not found`);
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
            throw new Error('Cannot confirm order. Some products have insufficient stock.', { insufficientStockProducts });
        }

        for (const item of order.products) {
            await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
        }
    }

    order.status = newStatus;
    if (newStatus === 'Delivered') {
        order.DeliveredAt = new Date();
    }
    order.history.push({ action: `Order is ${newStatus}`, date: formatDate(new Date()) });

    await order.save();
    return order;
};

exports.cancelOrder = async ({ orderId, userId, reason }) => {
    const order = await Order.findOne({ _id: orderId, user: userId }).populate('user');
    if (!order) throw new Error('Order not found');
    if (!['Draft', 'Pending'].includes(order.status)) {
        throw new Error('Order cannot be canceled at this stage');
    }

    order.status = 'Cancelled';
    order.cancellationReason = reason;
    order.history.push({ action: `Order cancelled - Reason: ${reason}`, date: formatDate(new Date()) });

    if (['momo', 'BankTransfer'].includes(order.PaymentMethod)) {
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

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) throw new Error('Order not found');
    if (order.status !== 'Cancelled' || order.refundStatus !== 'Pending') {
        throw new Error('Refund details can only be submitted for cancelled orders with pending refund');
    }

    order.refundInfo = { bankName, accountNumber, accountName: accountHolderName };
    await order.save();
    return order;
};