const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createOrder, getOrdersDetail, purchaseOrder, getOrderDetailByID, cancelOrder, submitRefundBankDetails, updatePaymentStatus, updateRefundStatus, updateOrderStatus,
    getRevenueComparison, getOrderComparison , getTopRatedProducts, getTopOrderedProductsController, getMonthlyRevenue, getWeeklyRevenue
} = require('../controllers/OrderController'); // Adjust path as needed
const orderService = require('../Services/orderService');

// Mock orderService
jest.mock('../Services/orderService', () => ({
    createOrder: jest.fn(),
    getOrdersDetail: jest.fn(),
    purchaseOrder: jest.fn(),
    getOrderDetailByID: jest.fn(),
    cancelOrder: jest.fn(),
    submitRefundBankDetails: jest.fn(),
    createMoMoPayment: jest.fn(),
    updatePaymentStatus: jest.fn(),
    updateRefundStatus: jest.fn(),
    updateOrderStatus: jest.fn(),
    getOrderDetails: jest.fn(),
    getRevenueComparison: jest.fn(),
    getOrderComparison: jest.fn(),
    getTopRatedProducts: jest.fn(),
    getTopOrderedProducts: jest.fn(),
    getMonthlyRevenue: jest.fn(), // Add mock for getMonthlyRevenue
    getWeeklyRevenue: jest.fn(),  // Add mock for getWeeklyRevenue
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Middleware to mock authenticated user for private routes
const verifyToken = (req, res, next) => {
    req.user = req.user || { userId: 'user123' };
    next();
};

// Define routes for ordersController
app.post('/api/v1/orders', verifyToken, createOrder);
app.get('/api/v1/orders/getUserOrders', verifyToken, getOrdersDetail);
app.post('/api/v1/orders/purchase', verifyToken, purchaseOrder);
app.get('/api/v1/orders/getUserDetailById/:orderId', verifyToken, getOrderDetailByID);
app.post('/api/v1/orders/cancle/:id', verifyToken, cancelOrder);
app.post('/api/v1/orders/:id/refund-details', verifyToken, submitRefundBankDetails);
app.put('/api/v1/orders/:orderId/payment-status', verifyToken, updatePaymentStatus); // Fixed route
app.put('/api/v1/orders/:orderId/refund-status', verifyToken, updateRefundStatus);   // Fixed route
app.put('/api/v1/orders/:orderId/status', verifyToken, updateOrderStatus);           // Fixed route
app.get('/api/v1/orders/revenue-comparison', getRevenueComparison);
app.get('/api/v1/orders/order-comparison', getOrderComparison);
app.get('/api/v1/orders/top-rated-products', getTopRatedProducts);
app.get('/api/v1/orders/top-ordered-products', getTopOrderedProductsController);
app.get('/api/v1/orders/monthly-revenue', getMonthlyRevenue); // Add route for monthly revenue
app.get('/api/v1/orders/weekly-revenue', getWeeklyRevenue);
let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(() => {
    jest.clearAllMocks();
    app.locals.io = { emit: jest.fn() };
});

// Helper to define tests with route metadata
const itWithRoute = (description, route, testFn) => {
    it(description, async () => {
        const result = testFn();
        Object.defineProperty(result, 'route', {
            value: route,
            enumerable: true,
        });
        await result;
    });
};

describe('Orders Controller', () => {
    describe('createOrder', () => {
        itWithRoute('should return 201 with new order on successful creation', '/api/v1/orders', async () => {
            const mockResult = { order: { _id: 'order123', userId: 'user123' }, isUpdated: false };
            orderService.createOrder.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/orders')
                .send({ orderID: 'order123', products: [], shippingAddress: '123 Street', PaymentMethod: 'cod' })
                .expect(201);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Order created successfully');
            expect(response.body.data).toEqual(mockResult.order);
            expect(orderService.createOrder).toHaveBeenCalledWith({
                userId: 'user123',
                orderID: 'order123',
                products: [],
                shippingAddress: '123 Street',
                PaymentMethod: 'cod',
            });
        });

        itWithRoute('should return 200 with updated order if exists', '/api/v1/orders', async () => {
            const mockResult = { order: { _id: 'order123', userId: 'user123' }, isUpdated: true };
            orderService.createOrder.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/orders')
                .send({ orderID: 'order123', products: [], shippingAddress: '123 Street', PaymentMethod: 'cod' })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Order updated successfully');
            expect(response.body.data).toEqual(mockResult.order);
            expect(orderService.createOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 400 for missing required fields', '/api/v1/orders', async () => {
            orderService.createOrder.mockRejectedValue(new Error('must include'));

            const response = await request(app)
                .post('/api/v1/orders')
                .send({ orderID: 'order123' }) // Missing products, shippingAddress, PaymentMethod
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('must include');
            expect(orderService.createOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders', async () => {
            orderService.createOrder.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/orders')
                .send({ orderID: 'order123', products: [], shippingAddress: '123 Street', PaymentMethod: 'cod' })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Server error');
            expect(orderService.createOrder).toHaveBeenCalled();
        });
    });

    describe('getOrdersDetail', () => {
        itWithRoute('should return 200 with user orders', '/api/v1/orders/getUserOrders', async () => {
            const mockResult = [{ _id: 'order123', userId: 'user123' }];
            orderService.getOrdersDetail.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/orders/getUserOrders')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Order details retrieved successfully');
            expect(response.body.data).toEqual(mockResult);
            expect(orderService.getOrdersDetail).toHaveBeenCalledWith('user123');
        });

        itWithRoute('should return 404 if no orders found', '/api/v1/orders/getUserOrders', async () => {
            orderService.getOrdersDetail.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/orders/getUserOrders')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No orders found for user user123');
            expect(orderService.getOrdersDetail).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/getUserOrders', async () => {
            orderService.getOrdersDetail.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .get('/api/v1/orders/getUserOrders')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Internal server error');
            expect(orderService.getOrdersDetail).toHaveBeenCalled();
        });
    });

    describe('purchaseOrder', () => {
        itWithRoute('should return 200 with order data for non-momo payment', '/api/v1/orders/purchase', async () => {
            const mockResult = { _id: 'order123', userId: 'user123' };
            orderService.purchaseOrder.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/orders/purchase')
                .send({ orderId: 'order123', shippingAddress: '123 Street', phone: '123456789', deliverAt: new Date(), paymentMethod: 'cod', totalPrice: 100 })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Order placed successfully, pending payment.');
            expect(response.body.data).toEqual(mockResult);
            expect(orderService.purchaseOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 200 with momo payment URL', '/api/v1/orders/purchase', async () => {
            orderService.purchaseOrder.mockResolvedValue({ _id: 'order123' });
            orderService.createMoMoPayment.mockResolvedValue('http://momo.url');

            const response = await request(app)
                .post('/api/v1/orders/purchase')
                .send({ orderId: 'order123', shippingAddress: '123 Street', phone: '123456789', deliverAt: new Date(), paymentMethod: 'momo', totalPrice: 100 })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Redirecting to MoMo');
            expect(response.body.momoPaymentUrl).toBe('http://momo.url');
            expect(orderService.createMoMoPayment).toHaveBeenCalledWith({ orderId: 'order123', totalPrice: 100 });
        });

        itWithRoute('should return 404 if no pending order', '/api/v1/orders/purchase', async () => {
            orderService.purchaseOrder.mockRejectedValue(new Error('No pending order'));

            const response = await request(app)
                .post('/api/v1/orders/purchase')
                .send({ orderId: 'order123', shippingAddress: '123 Street', phone: '123456789', deliverAt: new Date(), paymentMethod: 'cod', totalPrice: 100 })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No pending order');
            expect(orderService.purchaseOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/purchase', async () => {
            orderService.purchaseOrder.mockRejectedValue(new Error('Internal server error'));

            const response = await request(app)
                .post('/api/v1/orders/purchase')
                .send({ orderId: 'order123', shippingAddress: '123 Street', phone: '123456789', deliverAt: new Date(), paymentMethod: 'cod', totalPrice: 100 })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Internal server error');
            expect(orderService.purchaseOrder).toHaveBeenCalled();
        });
    });

    describe('getOrderDetailByID', () => {
        itWithRoute('should return 200 with order details', '/api/v1/orders/getUserDetailById/:orderId', async () => {
            const mockResult = { _id: 'order123', userId: 'user123' };
            orderService.getOrderDetailByID.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/orders/getUserDetailById/order123')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Order retrieved successfully');
            expect(response.body.data).toEqual(mockResult);
            expect(orderService.getOrderDetailByID).toHaveBeenCalledWith('order123');
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/getUserDetailById/:orderId', async () => {
            orderService.getOrderDetailByID.mockRejectedValue(new Error('not found'));

            const response = await request(app)
                .get('/api/v1/orders/getUserDetailById/order999')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('not found');
            expect(orderService.getOrderDetailByID).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/getUserDetailById/:orderId', async () => {
            orderService.getOrderDetailByID.mockRejectedValue(new Error('Internal server error'));

            const response = await request(app)
                .get('/api/v1/orders/getUserDetailById/order123')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Internal server error');
            expect(orderService.getOrderDetailByID).toHaveBeenCalled();
        });
    });

    describe('cancelOrder', () => {
        itWithRoute('should return 200 on successful cancellation', '/api/v1/orders/cancle/:id', async () => {
            const mockResult = { _id: 'order123', userId: 'user123', PaymentMethod: 'cod' };
            orderService.cancelOrder.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/orders/cancle/order123')
                .send({ reason: 'Changed mind' })
                .expect(200);

            expect(response.body.message).toBe('Order cancelled successfully');
            expect(response.body.refundRequired).toBe(false);
            expect(response.body.order).toEqual(mockResult);
            expect(orderService.cancelOrder).toHaveBeenCalledWith({ orderId: 'order123', userId: 'user123', reason: 'Changed mind' });
        });

        itWithRoute('should return 400 if order cannot be canceled', '/api/v1/orders/cancle/:id', async () => {
            orderService.cancelOrder.mockRejectedValue(new Error('cannot be canceled'));

            const response = await request(app)
                .post('/api/v1/orders/cancle/order123')
                .send({ reason: 'Changed mind' })
                .expect(400);

            expect(response.body.message).toBe('cannot be canceled');
            expect(orderService.cancelOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/cancle/:id', async () => {
            orderService.cancelOrder.mockRejectedValue(new Error('not found'));

            const response = await request(app)
                .post('/api/v1/orders/cancle/order999')
                .send({ reason: 'Changed mind' })
                .expect(404);

            expect(response.body.message).toBe('not found');
            expect(orderService.cancelOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/cancle/:id', async () => {
            orderService.cancelOrder.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/orders/cancle/order123')
                .send({ reason: 'Changed mind' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(orderService.cancelOrder).toHaveBeenCalled();
        });
    });

    describe('submitRefundBankDetails', () => {
        itWithRoute('should return 200 on successful submission', '/api/v1/orders/:id/refund-details', async () => {
            const mockResult = { _id: 'order123', userId: 'user123' };
            orderService.submitRefundBankDetails.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/orders/order123/refund-details')
                .send({ bankName: 'Bank A', accountNumber: '123456', accountHolderName: 'John Doe' })
                .expect(200);

            expect(response.body.message).toBe('Refund bank details submitted successfully');
            expect(response.body.order).toEqual(mockResult);
            expect(orderService.submitRefundBankDetails).toHaveBeenCalledWith({
                orderId: 'order123',
                userId: 'user123',
                bankName: 'Bank A',
                accountNumber: '123456',
                accountHolderName: 'John Doe',
            });
        });

        itWithRoute('should return 400 if required fields are missing', '/api/v1/orders/:id/refund-details', async () => {
            orderService.submitRefundBankDetails.mockRejectedValue(new Error('required'));

            const response = await request(app)
                .post('/api/v1/orders/order123/refund-details')
                .send({ bankName: 'Bank A', accountNumber: '123456' }) // Missing accountHolderName
                .expect(400);

            expect(response.body.message).toBe('required');
            expect(orderService.submitRefundBankDetails).toHaveBeenCalled();
        });

        itWithRoute('should return 400 if refund is pending', '/api/v1/orders/:id/refund-details', async () => {
            orderService.submitRefundBankDetails.mockRejectedValue(new Error('pending refund'));

            const response = await request(app)
                .post('/api/v1/orders/order123/refund-details')
                .send({ bankName: 'Bank A', accountNumber: '123456', accountHolderName: 'John Doe' })
                .expect(400);

            expect(response.body.message).toBe('pending refund');
            expect(orderService.submitRefundBankDetails).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/:id/refund-details', async () => {
            orderService.submitRefundBankDetails.mockRejectedValue(new Error('not found'));

            const response = await request(app)
                .post('/api/v1/orders/order999/refund-details')
                .send({ bankName: 'Bank A', accountNumber: '123456', accountHolderName: 'John Doe' })
                .expect(404);

            expect(response.body.message).toBe('not found');
            expect(orderService.submitRefundBankDetails).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/:id/refund-details', async () => {
            orderService.submitRefundBankDetails.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/orders/order123/refund-details')
                .send({ bankName: 'Bank A', accountNumber: '123456', accountHolderName: 'John Doe' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(orderService.submitRefundBankDetails).toHaveBeenCalled();
        });
    });
    describe('updatePaymentStatus', () => {
        itWithRoute('should return 200 on successful update', '/api/v1/orders/:orderId/payment-status', async () => {
            const mockOrder = { _id: 'order123', payingStatus: 'paid' };
            orderService.updatePaymentStatus.mockResolvedValue(mockOrder);

            const response = await request(app)
                .put('/api/v1/orders/order123/payment-status')
                .send({ payingStatus: 'paid' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Payment status updated successfully');
            expect(response.body.data).toEqual(mockOrder);
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order123', payingStatus: 'paid' });
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/:orderId/payment-status', async () => {
            orderService.updatePaymentStatus.mockRejectedValue(new Error('Order not found'));

            const response = await request(app)
                .put('/api/v1/orders/order999/payment-status')
                .send({ payingStatus: 'paid' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Order not found');
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order999', payingStatus: 'paid' });
        });

        itWithRoute('should return 400 on invalid status', '/api/v1/orders/:orderId/payment-status', async () => {
            orderService.updatePaymentStatus.mockRejectedValue(new Error('Invalid payment status'));

            const response = await request(app)
                .put('/api/v1/orders/order123/payment-status')
                .send({ payingStatus: 'invalid' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid payment status');
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order123', payingStatus: 'invalid' });
        });
    });

    describe('updatePaymentStatus', () => {
        itWithRoute('should return 200 on successful update', '/api/v1/orders/:orderId/payment-status', async () => {
            const mockOrder = { _id: 'order123', payingStatus: 'paid' };
            orderService.updatePaymentStatus.mockResolvedValue(mockOrder);

            const response = await request(app)
                .put('/api/v1/orders/order123/payment-status')
                .send({ payingStatus: 'paid' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Payment status updated successfully');
            expect(response.body.data).toEqual(mockOrder);
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order123', payingStatus: 'paid' });
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/:orderId/payment-status', async () => {
            orderService.updatePaymentStatus.mockRejectedValue(new Error('Order not found'));

            const response = await request(app)
                .put('/api/v1/orders/order999/payment-status')
                .send({ payingStatus: 'paid' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Order not found');
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order999', payingStatus: 'paid' });
        });

        itWithRoute('should return 400 on invalid status', '/api/v1/orders/:orderId/payment-status', async () => {
            orderService.updatePaymentStatus.mockRejectedValue(new Error('Invalid payment status'));

            const response = await request(app)
                .put('/api/v1/orders/order123/payment-status')
                .send({ payingStatus: 'invalid' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid payment status');
            expect(orderService.updatePaymentStatus).toHaveBeenCalledWith({ orderId: 'order123', payingStatus: 'invalid' });
        });
    });

    describe('updateRefundStatus', () => {
        itWithRoute('should return 200 on successful update with email sent', '/api/v1/orders/:orderId/refund-status', async () => {
            const mockResult = { updatedOrder: { _id: 'order123', refundStatus: 'approved' }, emailSent: true };
            orderService.updateRefundStatus.mockResolvedValue(mockResult);

            const response = await request(app)
                .put('/api/v1/orders/order123/refund-status')
                .send({ refundStatus: 'approved' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Refund status updated successfully and email sent');
            expect(response.body.data).toEqual(mockResult.updatedOrder);
            expect(orderService.updateRefundStatus).toHaveBeenCalledWith({ orderId: 'order123', refundStatus: 'approved' });
        });

        itWithRoute('should return 500 if email fails', '/api/v1/orders/:orderId/refund-status', async () => {
            const mockResult = { updatedOrder: { _id: 'order123', refundStatus: 'approved' }, emailSent: false };
            orderService.updateRefundStatus.mockResolvedValue(mockResult);

            const response = await request(app)
                .put('/api/v1/orders/order123/refund-status')
                .send({ refundStatus: 'approved' })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Refund status updated, but failed to send email notification');
            expect(response.body.data).toEqual(mockResult.updatedOrder);
            expect(orderService.updateRefundStatus).toHaveBeenCalledWith({ orderId: 'order123', refundStatus: 'approved' });
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/:orderId/refund-status', async () => {
            orderService.updateRefundStatus.mockRejectedValue(new Error('Order not found'));

            const response = await request(app)
                .put('/api/v1/orders/order999/refund-status')
                .send({ refundStatus: 'approved' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Order not found');
            expect(orderService.updateRefundStatus).toHaveBeenCalledWith({ orderId: 'order999', refundStatus: 'approved' });
        });

        itWithRoute('should return 400 on invalid status', '/api/v1/orders/:orderId/refund-status', async () => {
            orderService.updateRefundStatus.mockRejectedValue(new Error('Invalid refund status'));

            const response = await request(app)
                .put('/api/v1/orders/order123/refund-status')
                .send({ refundStatus: 'invalid' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid refund status');
            expect(orderService.updateRefundStatus).toHaveBeenCalledWith({ orderId: 'order123', refundStatus: 'invalid' });
        });
    });

    describe('updateOrderStatus', () => {
        itWithRoute('should return 200 on successful update', '/api/v1/orders/:orderId/status', async () => {
            const mockResult = { order: { _id: 'order123', status: 'Confirmed' }, emailSent: true };
            const mockPopulatedOrder = { _id: 'order123', status: 'Confirmed', details: 'populated' };
            orderService.updateOrderStatus.mockResolvedValue(mockResult);
            orderService.getOrderDetails.mockResolvedValue(mockPopulatedOrder);

            const response = await request(app)
                .put('/api/v1/orders/order123/status')
                .send({ newStatus: 'Confirmed', cancellationReason: null })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Order status updated to Confirmed');
            expect(response.body.order).toEqual(mockPopulatedOrder);
            expect(orderService.updateOrderStatus).toHaveBeenCalledWith({
                orderId: 'order123',
                newStatus: 'Confirmed',
                cancellationReason: null,
            });
            expect(orderService.getOrderDetails).toHaveBeenCalledWith('order123');
            expect(app.locals.io.emit).toHaveBeenCalledWith('orderStatusUpdated', {
                orderId: 'order123',
                newStatus: 'Confirmed',
                updatedAt: expect.any(Date),
            });
        });

        itWithRoute('should return 404 if order not found', '/api/v1/orders/:orderId/status', async () => {
            orderService.updateOrderStatus.mockRejectedValue(new Error('Order not found'));

            const response = await request(app)
                .put('/api/v1/orders/order999/status')
                .send({ newStatus: 'Confirmed', cancellationReason: null })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Order not found');
            expect(orderService.updateOrderStatus).toHaveBeenCalledWith({
                orderId: 'order999',
                newStatus: 'Confirmed',
                cancellationReason: null,
            });
            expect(app.locals.io.emit).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if newStatus is invalid', '/api/v1/orders/:orderId/status', async () => {
            const response = await request(app)
                .put('/api/v1/orders/order123/status')
                .send({ newStatus: 'shipped', cancellationReason: null })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid status value. Must be one of: Draft, Pending, Confirmed, Delivered, Cancelled, CancelledByAdmin');
            expect(orderService.updateOrderStatus).not.toHaveBeenCalled(); // Service should not be called due to validation failure
            expect(app.locals.io.emit).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if newStatus is missing', '/api/v1/orders/:orderId/status', async () => {
            const response = await request(app)
                .put('/api/v1/orders/order123/status')
                .send({ cancellationReason: null })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('newStatus is required');
            expect(orderService.updateOrderStatus).not.toHaveBeenCalled(); // Service should not be called due to validation failure
            expect(app.locals.io.emit).not.toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/:orderId/status', async () => {
            orderService.updateOrderStatus.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/api/v1/orders/order123/status')
                .send({ newStatus: 'Confirmed', cancellationReason: null })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Database error');
            expect(orderService.updateOrderStatus).toHaveBeenCalledWith({
                orderId: 'order123',
                newStatus: 'Confirmed',
                cancellationReason: null,
            });
            expect(app.locals.io.emit).not.toHaveBeenCalled();
        });
    });
    describe('getRevenueComparison', () => {
        itWithRoute('should return 200 with revenue comparison data', '/api/v1/orders/revenue-comparison', async () => {
            const mockRevenueData = {
                currentMonthRevenue: 1000,
                previousMonthRevenue: 800,
                percentageChange: "25.00%"
            };
            orderService.getRevenueComparison.mockResolvedValue(mockRevenueData);

            const response = await request(app)
                .get('/api/v1/orders/revenue-comparison')
                .expect(200);

            expect(response.body).toEqual(mockRevenueData);
            expect(orderService.getRevenueComparison).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/revenue-comparison', async () => {
            orderService.getRevenueComparison.mockRejectedValue(new Error('Failed to fetch revenue comparison'));

            const response = await request(app)
                .get('/api/v1/orders/revenue-comparison')
                .expect(500);

            expect(response.body.message).toBe('Internal server error');
            expect(response.body.error).toBe('Failed to fetch revenue comparison');
        });
    });

    describe('getOrderComparison', () => {
        itWithRoute('should return 200 with order comparison data', '/api/v1/orders/order-comparison', async () => {
            const mockOrderData = {
                currentMonthOrders: 50,
                previousMonthOrders: 40,
                percentageChange: "25.00%"
            };
            orderService.getOrderComparison.mockResolvedValue(mockOrderData);

            const response = await request(app)
                .get('/api/v1/orders/order-comparison')
                .expect(200);

            expect(response.body).toEqual(mockOrderData);
            expect(orderService.getOrderComparison).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/order-comparison', async () => {
            orderService.getOrderComparison.mockRejectedValue(new Error('Failed to fetch order comparison'));

            const response = await request(app)
                .get('/api/v1/orders/order-comparison')
                .expect(500);

            expect(response.body.message).toBe('Internal server error');
            expect(response.body.error).toBe('Failed to fetch order comparison');
        });
    });

    describe('getTopRatedProducts', () => {
        itWithRoute('should return 200 with top rated products', '/api/v1/orders/top-rated-products', async () => {
            const mockTopProducts = [
                {
                    _id: 'product123',
                    product_id: 'prod123',
                    name: 'Product 1',
                    averageRating: 4.8,
                    numberOfReviews: 10,
                    brand: 'Brand A',
                    price: 100,
                    MainImage: 'image.jpg',
                    stock: 50,
                    category: 'Category A',
                    type: 'Type A'
                }
            ];
            orderService.getTopRatedProducts.mockResolvedValue(mockTopProducts);

            const response = await request(app)
                .get('/api/v1/orders/top-rated-products')
                .expect(200);

            expect(response.body.message).toBe('Top 5 rated products fetched successfully');
            expect(response.body.data).toEqual(mockTopProducts);
            expect(orderService.getTopRatedProducts).toHaveBeenCalled();
        });

        itWithRoute('should return 200 with empty data if no top rated products found', '/api/v1/orders/top-rated-products', async () => {
            orderService.getTopRatedProducts.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/orders/top-rated-products')
                .expect(200);

            expect(response.body.message).toBe('No top-rated products found.');
            expect(response.body.data).toEqual([]);
            expect(orderService.getTopRatedProducts).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/top-rated-products', async () => {
            orderService.getTopRatedProducts.mockRejectedValue(new Error('Failed to fetch top rated products'));

            const response = await request(app)
                .get('/api/v1/orders/top-rated-products')
                .expect(500);

            expect(response.body.message).toBe('Server error while fetching top rated products');
            expect(response.body.error).toBe('Failed to fetch top rated products');
        });
    });

    describe('getTopOrderedProductsController', () => {
        itWithRoute('should return 200 with top ordered products', '/api/v1/orders/top-ordered-products', async () => {
            const mockTopProducts = [
                {
                    _id: 'product123',
                    productID: 'prod123',
                    productName: 'Product 1',
                    category: 'Category A',
                    brand: 'Brand A',
                    price: 100,
                    MainImage: 'image.jpg',
                    totalOrders: 50
                }
            ];
            orderService.getTopOrderedProducts.mockResolvedValue(mockTopProducts);

            const response = await request(app)
                .get('/api/v1/orders/top-ordered-products')
                .query({ category: 'All' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockTopProducts);
            expect(orderService.getTopOrderedProducts).toHaveBeenCalledWith({ category: 'All' });
        });

        itWithRoute('should return 200 with top ordered products for a specific category', '/api/v1/orders/top-ordered-products', async () => {
            const mockTopProducts = [
                {
                    _id: 'product123',
                    productID: 'prod123',
                    productName: 'Product 1',
                    category: 'Electronics',
                    brand: 'Brand A',
                    price: 100,
                    MainImage: 'image.jpg',
                    totalOrders: 30
                }
            ];
            orderService.getTopOrderedProducts.mockResolvedValue(mockTopProducts);

            const response = await request(app)
                .get('/api/v1/orders/top-ordered-products')
                .query({ category: 'Electronics' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual(mockTopProducts);
            expect(orderService.getTopOrderedProducts).toHaveBeenCalledWith({ category: 'Electronics' });
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/top-ordered-products', async () => {
            orderService.getTopOrderedProducts.mockRejectedValue(new Error('Failed to fetch top ordered products'));

            const response = await request(app)
                .get('/api/v1/orders/top-ordered-products')
                .query({ category: 'All' })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Failed to fetch top ordered products');
            expect(response.body.error).toBe('Failed to fetch top ordered products');
        });
    });

    // New test suites for getMonthlyRevenue and getWeeklyRevenue
    describe('getMonthlyRevenue', () => {
        itWithRoute('should return 200 with monthly revenue data', '/api/v1/orders/monthly-revenue', async () => {
            const mockMonthlyRevenueData = {
                monthlyRevenue: [
                    { month: 'January', revenue: 1000 },
                    { month: 'February', revenue: 1200 }
                ],
                range: 'Last 12 months'
            };
            orderService.getMonthlyRevenue.mockResolvedValue(mockMonthlyRevenueData);

            const response = await request(app)
                .get('/api/v1/orders/monthly-revenue')
                .expect(200);

            expect(response.body).toEqual(mockMonthlyRevenueData);
            expect(orderService.getMonthlyRevenue).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/monthly-revenue', async () => {
            orderService.getMonthlyRevenue.mockRejectedValue(new Error('Failed to fetch monthly revenue'));

            const response = await request(app)
                .get('/api/v1/orders/monthly-revenue')
                .expect(500);

            expect(response.body.message).toBe('Internal server error');
            expect(response.body.error).toBe('Failed to fetch monthly revenue');
        });
    });

    describe('getWeeklyRevenue', () => {
        itWithRoute('should return 200 with weekly revenue data', '/api/v1/orders/weekly-revenue', async () => {
            const mockWeeklyRevenueData = {
                weekDateRange: [
                    '2025-03-03 to 2025-03-09',
                    '2025-03-10 to 2025-03-16'
                ],
                weeklyRevenue: [
                    { week: '2025-03-03', revenue: 500 },
                    { week: '2025-03-10', revenue: 600 }
                ]
            };
            orderService.getWeeklyRevenue.mockResolvedValue(mockWeeklyRevenueData);

            const response = await request(app)
                .get('/api/v1/orders/weekly-revenue')
                .expect(200);

            expect(response.body).toEqual(mockWeeklyRevenueData);
            expect(orderService.getWeeklyRevenue).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/orders/weekly-revenue', async () => {
            orderService.getWeeklyRevenue.mockRejectedValue(new Error('Failed to fetch weekly revenue'));

            const response = await request(app)
                .get('/api/v1/orders/weekly-revenue')
                .expect(500);

            expect(response.body.message).toBe('Internal server error');
            expect(response.body.error).toBe('Failed to fetch weekly revenue');
        });
    });
});