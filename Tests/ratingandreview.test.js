const request = require('supertest');
const express = require('express');

const reviewController = require('../controllers/ReviewAndRatingController'); // Adjust path
const reviewService = require('../Services/reviewService');

// Mock reviewService
jest.mock('../Services/reviewService', () => ({
    addReview: jest.fn(),
    getReviews: jest.fn(),
    getUserReviewForProductOrder: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Middleware to mock authenticated user for protected routes
const mockAuthMiddleware = (req, res, next) => {
    req.user = req.user || { userId: 'user123' };
    next();
};

// Define routes for reviewController
app.post('/api/v1/reviews/:id/add', mockAuthMiddleware, reviewController.addReview);
app.get('/api/v1/reviews/:id/reviews', reviewController.getReviews);
app.get('/api/v1/reviews/:id/order/:orderID/review', mockAuthMiddleware, reviewController.getUserReviewForProductOrder);


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

describe('Review Controller', () => {
    describe('addReview', () => {
        itWithRoute('should return 201 with review on successful addition', '/api/v1/reviews/:id/add', async () => {
            const mockReview = { id: 'review1', rating: 5, comment: 'Great product' };
            reviewService.addReview.mockResolvedValue({ review: mockReview });

            const response = await request(app)
                .post('/api/v1/reviews/prod123/add')
                .send({ rating: 5, comment: 'Great product', name: 'John', orderID: 'order1' })
                .expect(201);

            expect(response.body.message).toBe('Review added successfully.');
            expect(response.body.review).toEqual(mockReview);
            expect(reviewService.addReview).toHaveBeenCalledWith({
                userId: 'user123',
                productId: 'prod123',
                rating: 5,
                comment: 'Great product',
                name: 'John',
                orderID: 'order1',
            });
        });

        itWithRoute('should return 400 if product already reviewed', '/api/v1/reviews/:id/add', async () => {
            reviewService.addReview.mockRejectedValue(new Error('Product already reviewed'));

            const response = await request(app)
                .post('/api/v1/reviews/prod123/add')
                .send({ rating: 5, comment: 'Great product', name: 'John', orderID: 'order1' })
                .expect(400);

            expect(response.body.message).toBe('Product already reviewed');
            expect(reviewService.addReview).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if product not found', '/api/v1/reviews/:id/add', async () => {
            reviewService.addReview.mockRejectedValue(new Error('Product not found'));

            const response = await request(app)
                .post('/api/v1/reviews/prod999/add')
                .send({ rating: 5, comment: 'Great product', name: 'John', orderID: 'order1' })
                .expect(404);

            expect(response.body.message).toBe('Product not found');
            expect(reviewService.addReview).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/reviews/:id/add', async () => {
            reviewService.addReview.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/v1/reviews/prod123/add')
                .send({ rating: 5, comment: 'Great product', name: 'John', orderID: 'order1' })
                .expect(500);

            expect(response.body.message).toBe('Database error');
            expect(reviewService.addReview).toHaveBeenCalled();
        });
    });

    describe('getReviews', () => {
        itWithRoute('should return 200 with reviews and average rating', '/api/v1/reviews/:id/reviews', async () => {
            const mockReviews = [{ id: 'review1', rating: 5 }];
            const mockAverageRating = 5;
            reviewService.getReviews.mockResolvedValue({ reviews: mockReviews, averageRating: mockAverageRating });

            const response = await request(app)
                .get('/api/v1/reviews/prod123/reviews')
                .expect(200);

            expect(response.body.reviews).toEqual(mockReviews);
            expect(response.body.averageRating).toBe(mockAverageRating);
            expect(reviewService.getReviews).toHaveBeenCalledWith({ productId: 'prod123' });
        });

        itWithRoute('should return 404 if no reviews found', '/api/v1/reviews/:id/reviews', async () => {
            reviewService.getReviews.mockRejectedValue(new Error('No reviews found'));

            const response = await request(app)
                .get('/api/v1/reviews/prod123/reviews')
                .expect(404);

            expect(response.body.message).toBe('No reviews found');
            expect(reviewService.getReviews).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/reviews/:id/reviews', async () => {
            reviewService.getReviews.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .get('/api/v1/reviews/prod123/reviews')
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(reviewService.getReviews).toHaveBeenCalled();
        });
    });

    describe('getUserReviewForProductOrder', () => {
        itWithRoute('should return 200 with user review', '/api/v1/reviews/:id/order/:orderID/review', async () => {
            const mockReview = { id: 'review1', rating: 5, comment: 'Great product' };
            reviewService.getUserReviewForProductOrder.mockResolvedValue({ review: mockReview });

            const response = await request(app)
                .get('/api/v1/reviews/prod123/order/order1/review')
                .expect(200);

            expect(response.body.review).toEqual(mockReview);
            expect(reviewService.getUserReviewForProductOrder).toHaveBeenCalledWith({
                userId: 'user123',
                productId: 'prod123',
                orderID: 'order1',
            });
        });

        itWithRoute('should return 404 if no review found', '/api/v1/reviews/:id/order/:orderID/review', async () => {
            reviewService.getUserReviewForProductOrder.mockRejectedValue(
                new Error('No review found for this product in this order.')
            );

            const response = await request(app)
                .get('/api/v1/reviews/prod123/order/order1/review')
                .expect(404);

            expect(response.body.message).toBe('No review found for this product in this order.');
            expect(reviewService.getUserReviewForProductOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 400 if orderID is missing', '/api/v1/reviews/:id/order/:orderID/review', async () => {
            // Simulating a missing orderID by not providing it in the route would typically be handled by Express routing,
            // but we'll mock the service error for consistency with your controller
            reviewService.getUserReviewForProductOrder.mockRejectedValue(
                new Error('Order ID is required.')
            );

            const response = await request(app)
                .get('/api/v1/reviews/prod123/order/%20/review') // Invalid route, but testing service rejection
                .expect(400);

            expect(response.body.message).toBe('Order ID is required.');
            expect(reviewService.getUserReviewForProductOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 401 if user not logged in', '/api/v1/reviews/:id/order/:orderID/review', async () => {
            reviewService.getUserReviewForProductOrder.mockRejectedValue(
                new Error('User must be logged in to view their review.')
            );

            const response = await request(app)
                .get('/api/v1/reviews/prod123/order/order1/review')
                .set('Authorization', '') // Simulate no token, but middleware sets user by default; rely on service error
                .expect(401);

            expect(response.body.message).toBe('User must be logged in to view their review.');
            expect(reviewService.getUserReviewForProductOrder).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/reviews/:id/order/:orderID/review', async () => {
            reviewService.getUserReviewForProductOrder.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/v1/reviews/prod123/order/order1/review')
                .expect(500);

            expect(response.body.message).toBe('Database error');
            expect(reviewService.getUserReviewForProductOrder).toHaveBeenCalled();
        });
    });
});