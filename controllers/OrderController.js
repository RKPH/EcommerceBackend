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

        return res.status(isUpdated ? 200 : 201).json({
            status: 'success',
            message: isUpdated ? 'Order updated successfully' : 'Order created successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error creating or updating order:', error.message);
        return res.status(error.message.includes('must include') ? 400 : 500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const { page, limit, search, status } = req.query;
        const { orders, totalOrders, pageNum, limitNum } = await orderService.getAllOrders({
            page,
            limit,
            search,
            status,
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No orders found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Orders retrieved successfully',
            data: orders,
            pagination: {
                totalItems: totalOrders,
                totalPages: Math.ceil(totalOrders / limitNum),
                currentPage: pageNum,
                itemsPerPage: limitNum,
            },
        });
    } catch (error) {
        console.error('Error retrieving orders:', error.message);
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getOrdersDetail = async (req, res) => {
    const { userId } = req.user;
    try {
        const orders = await orderService.getOrdersDetail(userId);
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
        return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.purchaseOrder = async (req, res) => {
    const { userId } = req.user;
    const { orderId, shippingAddress, deliverAt, paymentMethod, totalPrice } = req.body;

    try {
        const order = await orderService.purchaseOrder({
            userId,
            orderId,
            shippingAddress,
            deliverAt,
            paymentMethod,
            totalPrice,
        });

        if (paymentMethod === 'momo') {
            const momoPaymentUrl = await orderService.createMoMoPayment({ orderId, totalPrice });
            return res.status(200).json({
                status: 'success',
                message: 'Redirecting to MoMo',
                momoPaymentUrl,
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Order placed successfully, pending payment.',
            data: order,
        });
    } catch (error) {
        console.error('Error processing purchase:', error.message);
        return res.status(error.message.includes('No pending order') ? 404 : 500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

exports.getOrderDetailByID = async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await orderService.getOrderDetailByID(orderId);
        return res.status(200).json({
            status: 'success',
            message: 'Order retrieved successfully',
            data: order,
        });
    } catch (error) {
        console.error('Error retrieving order:', error.message);
        return res.status(error.message.includes('not found') ? 404 : 500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { newStatus } = req.body;

    try {
        const order = await orderService.updateOrderStatus({ orderId, newStatus });

        const io = req.app.locals.io;
        io.emit('orderStatusUpdated', {
            orderId: order._id,
            newStatus,
            updatedAt: new Date(),
        });

        return res.status(200).json({ message: `Order status updated to ${newStatus}`, order });
    } catch (error) {
        console.error('Error updating order status:', error);
        return res.status(error.message.includes('Invalid status') || error.message.includes('insufficient stock') ? 400 : error.message.includes('not found') ? 404 : 500).json({
            message: error.message || 'Server error',
            ...(error.insufficientStockProducts && { insufficientStockProducts: error.insufficientStockProducts }),
        });
    }
};

exports.cancelOrder = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const { reason } = req.body;

    try {
        const order = await orderService.cancelOrder({ orderId: id, userId, reason });
        return res.status(200).json({
            message: 'Order cancelled successfully',
            refundRequired: ['momo', 'BankTransfer'].includes(order.PaymentMethod),
            order,
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return res.status(error.message.includes('cannot be canceled') ? 400 : error.message.includes('not found') ? 404 : 500).json({
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
        return res.status(200).json({ message: 'Refund bank details submitted successfully', order });
    } catch (error) {
        console.error('Error submitting refund bank details:', error);
        return res.status(error.message.includes('required') || error.message.includes('pending refund') ? 400 : error.message.includes('not found') ? 404 : 500).json({
            message: error.message || 'Server error',
        });
    }
};