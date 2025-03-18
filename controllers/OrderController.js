const orderService = require('../Services/orderService');

exports.createOrder = async (req, res) => {
    const { userId } = req.user;
    const { orderID, products, shippingAddress, PaymentMethod } = req.body;

    try {
        const { order, isUpdated } = await orderService.createOrder({
            userId,
            orderID,
            products,
            shippingAddress,
            PaymentMethod,
        });

        const statusCode = isUpdated ? 200 : 201;
        const message = isUpdated ? 'Order updated successfully' : 'Order created successfully';

        res.status(statusCode).json({
            status: 'success',
            message,
            data: order,
        });
    } catch (error) {
        console.error('Error creating or updating order:', error.message);
        const statusCode = error.message.includes('must include') ? 400 : 500;
        const response = {
            status: 'error',
            message: error.message || 'Internal server error',
        };

        res.status(statusCode).json(response);
    }
};

exports.getAllOrders = async (req, res) => {
    const { page, limit, search, status } = req.query;

    try {
        const { orders, totalOrders, pageNum, limitNum } = await orderService.getAllOrders({
            page,
            limit,
            search,
            status,
        });

        if (!orders || orders.length === 0) {
            res.status(404).json({
                status: 'error',
                message: 'No orders found',
            });
            return;
        }

        const pagination = {
            totalItems: totalOrders,
            totalPages: Math.ceil(totalOrders / limitNum),
            currentPage: pageNum,
            itemsPerPage: limitNum,
        };

        res.status(200).json({
            status: 'success',
            message: 'Orders retrieved successfully',
            data: orders,
            pagination,
        });
    } catch (error) {
        console.error('Error retrieving orders:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

exports.getOrdersDetail = async (req, res) => {
    const { userId } = req.user;

    try {
        const orders = await orderService.getOrdersDetail(userId);

        if (orders.length === 0) {
            res.status(404).json({
                status: 'error',
                message: `No orders found for user ${userId}`,
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Order details retrieved successfully',
            data: orders,
        });
    } catch (error) {
        console.error('Error retrieving order details:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

exports.purchaseOrder = async (req, res) => {
    const { userId } = req.user;
    const { orderId, shippingAddress, phone, deliverAt, paymentMethod, totalPrice } = req.body;

    try {
        const order = await orderService.purchaseOrder({
            userId,
            orderId,
            shippingAddress,
            phone,
            deliverAt,
            paymentMethod,
            totalPrice,
        });

        if (paymentMethod === 'momo') {
            const momoPaymentUrl = await orderService.createMoMoPayment({ orderId, totalPrice });
            res.status(200).json({
                status: 'success',
                message: 'Redirecting to MoMo',
                momoPaymentUrl,
            });
            return;
        }

        res.status(200).json({
            status: 'success',
            message: 'Order placed successfully, pending payment.',
            data: order,
        });
    } catch (error) {
        console.error('Error processing purchase:', error.message);
        const statusCode = error.message.includes('No pending order') ? 404 : 500;
        res.status(statusCode).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

exports.getOrderDetailByID = async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await orderService.getOrderDetailByID(orderId);

        res.status(200).json({
            status: 'success',
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error retrieving order:', error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

exports.cancelOrder = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const { reason } = req.body;

    try {
        const order = await orderService.cancelOrder({ orderId: id, userId, reason });

        res.status(200).json({
            message: 'Order cancelled successfully',
            refundRequired: ['momo', 'BankTransfer'].includes(order.PaymentMethod),
            order,
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        let statusCode;
        if (error.message.includes('cannot be canceled')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        } else {
            statusCode = 500;
        }
        res.status(statusCode).json({
            message: error.message || 'Server error',
        });
    }
};

exports.submitRefundBankDetails = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const { bankName, accountNumber, accountHolderName } = req.body;

    try {
        const order = await orderService.submitRefundBankDetails({
            orderId: id,
            userId,
            bankName,
            accountNumber,
            accountHolderName,
        });

        res.status(200).json({
            message: 'Refund bank details submitted successfully',
            order,
        });
    } catch (error) {
        console.error('Error submitting refund bank details:', error);
        let statusCode;
        if (error.message.includes('required') || error.message.includes('pending refund')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        } else {
            statusCode = 500;
        }
        res.status(statusCode).json({
            message: error.message || 'Server error',
        });
    }
};

module.exports = {
    createOrder: exports.createOrder,
    getAllOrders: exports.getAllOrders,
    getOrdersDetail: exports.getOrdersDetail,
    purchaseOrder: exports.purchaseOrder,
    getOrderDetailByID: exports.getOrderDetailByID,
    cancelOrder: exports.cancelOrder,
    submitRefundBankDetails: exports.submitRefundBankDetails,
};