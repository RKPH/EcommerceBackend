const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createOrder, getOrdersDetail, purchaseOrder, getOrderDetailByID, cancelOrder, submitRefundBankDetails } = require('../controllers/OrderController'); // Adjust path as needed
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
});