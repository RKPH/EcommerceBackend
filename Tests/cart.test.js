const request = require('supertest');
const express = require('express');

const { MongoMemoryServer } = require('mongodb-memory-server');
const cartController = require('../controllers/cartController'); // Adjust path to your controller
const cartService = require('../Services/cartService');

// Mock cartService
jest.mock('../Services/cartService', () => ({
    addProductToCart: jest.fn(),
    getCartItems: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Middleware to mock authenticated user for private routes
const mockAuthMiddleware = (req, res, next) => {
    req.user = req.user || { userId: 'user123' };
    next();
};

// Define routes for cartController
app.post('/api/v1/cart/add', mockAuthMiddleware, cartController.addProductToCart);
app.get('/api/v1/cart', mockAuthMiddleware, cartController.getCartItems);
app.put('/api/v1/cart/update', mockAuthMiddleware, cartController.updateCartItem);
app.delete('/api/v1/cart/remove', mockAuthMiddleware, cartController.removeCartItem);



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

describe('Cart Controller', () => {
    describe('addProductToCart', () => {
        itWithRoute('should return 201 with cart item and count on successful addition', '/api/v1/cart/add', async () => {
            const mockResult = {
                cartItem: { productId: 'prod123', quantity: 2, userId: 'user123' },
                cartCount: 1,
            };
            cartService.addProductToCart.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ productId: 'prod123', quantity: 2 })
                .expect(201);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Product added to cart successfully');
            expect(response.body.data).toEqual(mockResult.cartItem);
            expect(response.body.Length).toBe(mockResult.cartCount);
            expect(cartService.addProductToCart).toHaveBeenCalledWith('prod123', 2, 'user123');
        });

        itWithRoute('should return 200 with updated quantity if item exists', '/api/v1/cart/add', async () => {
            const mockResult = {
                cartItem: { productId: 'prod123', quantity: 3, userId: 'user123' },
                cartCount: 1,
            };
            cartService.addProductToCart.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ productId: 'prod123', quantity: 2 })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Product quantity updated in cart successfully');
            expect(response.body.data).toEqual(mockResult.cartItem);
            expect(response.body.cartCount).toBe(mockResult.cartCount);
            expect(cartService.addProductToCart).toHaveBeenCalledWith('prod123', 2, 'user123');
        });

        itWithRoute('should return 400 for missing or invalid input', '/api/v1/cart/add', async () => {
            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ quantity: -1 })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('productId and a positive quantity are required');
            expect(cartService.addProductToCart).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if product not found', '/api/v1/cart/add', async () => {
            cartService.addProductToCart.mockRejectedValue(new Error('Product not found'));

            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ productId: 'prod999', quantity: 2 })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Product not found');
            expect(cartService.addProductToCart).toHaveBeenCalled();
        });

        itWithRoute('should return 401 if unauthorized', '/api/v1/cart/add', async () => {
            cartService.addProductToCart.mockRejectedValue(new Error('Unauthorized'));

            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ productId: 'prod123', quantity: 2 })
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Unauthorized to add product to cart');
            expect(cartService.addProductToCart).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/cart/add', async () => {
            cartService.addProductToCart.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/cart/add')
                .send({ productId: 'prod123', quantity: 2 })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Server error');
            expect(cartService.addProductToCart).toHaveBeenCalled();
        });
    });

    describe('getCartItems', () => {
        itWithRoute('should return 200 with cart items', '/api/v1/cart', async () => {
            const mockResult = [{ productId: 'prod123', quantity: 2 }];
            cartService.getCartItems.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/cart')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Cart items retrieved successfully');
            expect(response.body.data).toEqual(mockResult);
            expect(cartService.getCartItems).toHaveBeenCalledWith('user123');
        });

        itWithRoute('should return 404 if cart not found', '/api/v1/cart', async () => {
            cartService.getCartItems.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/v1/cart')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Cart not found for this user');
            expect(cartService.getCartItems).toHaveBeenCalled();
        });

        itWithRoute('should return 401 if unauthorized', '/api/v1/cart', async () => {
            cartService.getCartItems.mockRejectedValue(new Error('Unauthorized'));

            const response = await request(app)
                .get('/api/v1/cart')
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Unauthorized to access cart');
            expect(cartService.getCartItems).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/cart', async () => {
            cartService.getCartItems.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .get('/api/v1/cart')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Server error');
            expect(cartService.getCartItems).toHaveBeenCalled();
        });
    });

    describe('updateCartItem', () => {
        itWithRoute('should return 200 with updated cart item', '/api/v1/cart/update', async () => {
            const mockResult = { cartItemID: 'item123', quantity: 5 };
            cartService.updateCartItem.mockResolvedValue(mockResult);

            const response = await request(app)
                .put('/api/v1/cart/update')
                .send({ cartItemID: 'item123', quantity: 5 })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Cart item updated successfully');
            expect(response.body.data).toEqual(mockResult);
            expect(cartService.updateCartItem).toHaveBeenCalledWith('item123', 5);
        });

        itWithRoute('should return 400 for invalid input', '/api/v1/cart/update', async () => {
            const response = await request(app)
                .put('/api/v1/cart/update')
                .send({ quantity: -1 })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('cartItemID and a non-negative quantity are required');
            expect(cartService.updateCartItem).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if cart item not found', '/api/v1/cart/update', async () => {
            cartService.updateCartItem.mockResolvedValue(null);

            const response = await request(app)
                .put('/api/v1/cart/update')
                .send({ cartItemID: 'item999', quantity: 5 })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Cart item not found');
            expect(cartService.updateCartItem).toHaveBeenCalled();
        });

        itWithRoute('should return 401 if unauthorized', '/api/v1/cart/update', async () => {
            cartService.updateCartItem.mockRejectedValue(new Error('Unauthorized'));

            const response = await request(app)
                .put('/api/v1/cart/update')
                .send({ cartItemID: 'item123', quantity: 5 })
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Unauthorized to update cart item');
            expect(cartService.updateCartItem).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/cart/update', async () => {
            cartService.updateCartItem.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .put('/api/v1/cart/update')
                .send({ cartItemID: 'item123', quantity: 5 })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Server error');
            expect(cartService.updateCartItem).toHaveBeenCalled();
        });
    });

    describe('removeCartItem', () => {
        itWithRoute('should return 200 on successful removal', '/api/v1/cart/remove', async () => {
            cartService.removeCartItem.mockResolvedValue(true);

            const response = await request(app)
                .delete('/api/v1/cart/remove')
                .send({ cartItemID: 'item123' })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Cart item removed successfully');
            expect(cartService.removeCartItem).toHaveBeenCalledWith('item123', 'user123');
        });

        itWithRoute('should return 400 for missing cartItemID', '/api/v1/cart/remove', async () => {
            const response = await request(app)
                .delete('/api/v1/cart/remove')
                .send({})
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('cartItemID and userId are required');
            expect(cartService.removeCartItem).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if cart item not found', '/api/v1/cart/remove', async () => {
            cartService.removeCartItem.mockResolvedValue(false);

            const response = await request(app)
                .delete('/api/v1/cart/remove')
                .send({ cartItemID: 'item999' })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Cart item not found or not authorized to remove');
            expect(cartService.removeCartItem).toHaveBeenCalled();
        });

        itWithRoute('should return 401 if unauthorized', '/api/v1/cart/remove', async () => {
            cartService.removeCartItem.mockRejectedValue(new Error('Unauthorized'));

            const response = await request(app)
                .delete('/api/v1/cart/remove')
                .send({ cartItemID: 'item123' })
                .expect(401);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Unauthorized to remove cart item');
            expect(cartService.removeCartItem).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/cart/remove', async () => {
            cartService.removeCartItem.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .delete('/api/v1/cart/remove')
                .send({ cartItemID: 'item123' })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Server error');
            expect(cartService.removeCartItem).toHaveBeenCalled();
        });
    });
});