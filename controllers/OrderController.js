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

exports.getOrderDetailsForAdmin = async (req, res) => {
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

exports.purchaseOrder = async (req, res) => {
    const { userId } = req.user;
    const { orderId, shippingAddress, phone, deliverAt, shippingFee, paymentMethod, totalPrice } = req.body;

    try {
        const order = await orderService.purchaseOrder({
            userId,
            orderId,
            shippingAddress,
            phone,
            deliverAt,
            shippingFee,
            paymentMethod,
            totalPrice,
        });

        // Notify admin about the new purchase
        const io = req.app.locals.io;
        io.to("admin").emit("newOrderPlaced", {
            id: order._id,
            orderId: order.order_id,
            userId,
            totalPrice,
            paymentMethod,
            createdAt: new Date(),
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

        // Notify admin about the refund bank details submission
        const io = req.app.locals.io;
        io.to("admin").emit("refundBankDetailsSubmitted", {
            orderId: id,
            userId,
            bankName,
            accountNumber,
            accountHolderName,
            submittedAt: new Date(),
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

exports.updatePaymentStatus = async (req, res) => {
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

exports.updateRefundStatus = async (req, res) => {
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

exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { newStatus, cancellationReason } = req.body;

        // Validate newStatus
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: 'newStatus is required',
            });
        }

        const validStatuses = ['Draft', 'Pending', 'Confirmed', 'Delivering' ,'Delivered', 'Cancelled', 'CancelledByAdmin'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const { order: updatedOrder, emailSent } = await orderService.updateOrderStatus({
            orderId,
            newStatus,
            cancellationReason,
        });

        const io = req.app.locals.io;
        // Emit the event to the specific user's room
        const userId = updatedOrder.user._id.toString();

        console.log("user: ", userId);
        io.to(userId).emit("orderStatusUpdated", {
            id: updatedOrder._id,
            orderId: updatedOrder.order_id,
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
        console.error('Error updating order status:', error.message, error.stack);
        if (error.message.includes("not found")) {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        if (error.message.includes("Invalid status value")) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

exports.getMonthlyRevenue = async (req, res) => {
    try {
        const { monthlyRevenue, range } = await orderService.getMonthlyRevenue();
        res.status(200).json({ monthlyRevenue, range });
    } catch (error) {
        console.error("Error fetching revenue:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.getWeeklyRevenue = async (req, res) => {
    try {
        const { weekDateRange, weeklyRevenue } = await orderService.getWeeklyRevenue();
        res.status(200).json({ weekDateRange, weeklyRevenue });
    } catch (error) {
        console.error("Error fetching weekly revenue:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.getRevenueComparison = async (req, res) => {
    try {
        const revenueData = await orderService.getRevenueComparison();
        res.status(200).json(revenueData);
    } catch (error) {
        console.error("Error in getRevenueComparison controller:", error.message, error.stack);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.getOrderComparison = async (req, res) => {
    try {
        const orderData = await orderService.getOrderComparison();
        res.status(200).json(orderData);
    } catch (error) {
        console.error("Error in getOrderComparison controller:", error.message, error.stack);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.getTopRatedProducts = async (req, res) => {
    try {
        const topProducts = await orderService.getTopRatedProducts();
        if (!topProducts.length) {
            return res.status(200).json({
                message: "No top-rated products found.",
                data: []
            });
        }
        res.status(200).json({
            message: "Top 5 rated products fetched successfully",
            data: topProducts
        });
    } catch (error) {
        console.error("Error in getTopRatedProducts controller:", error.message, error.stack);
        res.status(500).json({
            message: "Server error while fetching top rated products",
            error: error.message
        });
    }
};

exports.getTopOrderedProductsController = async (req, res) => {
    try {
        const { category = 'All' } = req.query;
        const topProducts = await orderService.getTopOrderedProducts({ category });
        res.status(200).json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error("Error in getTopOrderedProductsController:", error.message, error.stack);
        res.status(500).json({
            success: false,
            message: "Failed to fetch top ordered products",
            error: error.message
        });
    }
};

exports.getOrdersWithRefundRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, refundStatus = 'All' } = req.query;
        const { orders, totalOrders, pagination } = await orderService.getOrdersWithRefundRequests({
            page,
            limit,
            search,
            refundStatus,
        });

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No orders with refund requests found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Orders with refund requests retrieved successfully',
            data: orders,
            pagination,
        });
    } catch (error) {
        console.error('Error fetching orders with refund requests:', error.message, error.stack);
        const statusCode = error.message.includes('Invalid') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};