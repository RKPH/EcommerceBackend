const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const productController = require('../controllers/productController');
const productService = require('../Services/productService');

// Mock productService
jest.mock('../Services/productService', () => ({
    getAllProducts: jest.fn(),
    getProductById: jest.fn(),
    getAllTypes: jest.fn(),
    getTypesByCategory: jest.fn().mockImplementation((category) => {
        console.log('Mock getTypesByCategory called with:', category);
        if (!category || category === "") {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }),
    getAllCategories: jest.fn(),
    getProductByTypes: jest.fn(),
    getProductsByCategories: jest.fn(),
    getRecommendations: jest.fn(),
    sessionBasedRecommendation: jest.fn(),
    anonymousRecommendation: jest.fn(),
    getTopTrendingProducts: jest.fn(),
    searchProducts: jest.fn(),
    searchProductsPaginated: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Định nghĩa các route theo router.js
app.get('/api/v1/products/search', productController.searchProducts);
app.get('/api/v1/products/searchFullPage', productController.searchProductsPaginated);
app.get('/api/v1/products/types', productController.getAllTypes);
app.get('/api/v1/products/types/category/:category', productController.getTypesByCategory);
app.get('/api/v1/products/categories', productController.getAllCategories);
app.get('/api/v1/products/type/:type', productController.getProductByTypes);
app.get('/api/v1/products/category/:category', productController.getProductsByCategories);
app.get('/api/v1/products/trending', productController.getTopTrendingProducts);
app.get('/api/v1/products/all', productController.getAllProducts);
app.get('/api/v1/products/:id', productController.getProductById);
app.post('/api/v1/products/predict/:product_id', productController.getRecommendations);
app.post('/api/v1/products/recommendations', productController.sessionBasedRecommendation);
app.post('/api/v1/products/anomynus_recommendations', productController.anonymousRecommendation);

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

describe('Product Controller', () => {
    describe('getAllProducts', () => {
        itWithRoute('should return 200 with products and pagination', '/api/v1/products/all', async () => {
            const mockResult = {
                products: [{ product_id: 1, name: 'Product 1' }],
                currentPage: 1,
                totalPages: 1,
                totalItems: 1,
                itemsPerPage: 10,
            };
            productService.getAllProducts.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/all?page=1&limit=10')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Products retrieved successfully');
            expect(response.body.data).toEqual(mockResult.products);
            expect(response.body.pagination).toEqual({
                currentPage: 1,
                totalPages: 1,
                totalItems: 1,
                itemsPerPage: 10,
            });
            expect(productService.getAllProducts).toHaveBeenCalledWith({
                page: '1',
                limit: '10',
                category: undefined,
                type: undefined,
                search: undefined,
            });
        });

        itWithRoute('should return 400 if page is invalid', '/api/v1/products/all', async () => {
            const response = await request(app)
                .get('/api/v1/products/all?page=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Page must be a valid number.');
            expect(productService.getAllProducts).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if limit is invalid', '/api/v1/products/all', async () => {
            const response = await request(app)
                .get('/api/v1/products/all?page=1&limit=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Limit must be a valid number.');
            expect(productService.getAllProducts).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no products found', '/api/v1/products/all', async () => {
            const mockResult = {
                products: [],
                currentPage: 1,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: 10,
            };
            productService.getAllProducts.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/all')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No products found.');
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                currentPage: 1,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: 10,
            });
            expect(productService.getAllProducts).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/all', async () => {
            productService.getAllProducts.mockRejectedValue(new Error('Failed to retrieve products due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/all')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve products due to a server error.');
            expect(productService.getAllProducts).toHaveBeenCalled();
        });
    });

    describe('getProductById', () => {
        itWithRoute('should return 200 with product data', '/api/v1/products/:id', async () => {
            const mockResult = {
                product: { product_id: 1, name: 'Product 1' },
                productId: '1',
            };
            productService.getProductById.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/1')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Product with product_id 1 retrieved successfully');
            expect(response.body.data).toEqual(mockResult.product);
            expect(productService.getProductById).toHaveBeenCalledWith('1');
        });

        itWithRoute('should return 400 if id is invalid', '/api/v1/products/:id', async () => {
            const response = await request(app)
                .get('/api/v1/products/invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID. Must be a number.');
            expect(productService.getProductById).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if product not found', '/api/v1/products/:id', async () => {
            productService.getProductById.mockResolvedValue({ product: null, productId: '999' });

            const response = await request(app)
                .get('/api/v1/products/999')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Product with product_id 999 not found');
            expect(response.body.data).toBeNull();
            expect(productService.getProductById).toHaveBeenCalledWith('999');
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/:id', async () => {
            productService.getProductById.mockRejectedValue(new Error('Failed to retrieve product due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/1')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve product due to a server error.');
            expect(productService.getProductById).toHaveBeenCalledWith('1');
        });
    });

    describe('getAllTypes', () => {
        itWithRoute('should return 200 with types', '/api/v1/products/types', async () => {
            const mockTypes = ['Type1', 'Type2'];
            productService.getAllTypes.mockResolvedValue(mockTypes);

            const response = await request(app)
                .get('/api/v1/products/types')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Types retrieved successfully');
            expect(response.body.data).toEqual(mockTypes);
            expect(productService.getAllTypes).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no types found', '/api/v1/products/types', async () => {
            productService.getAllTypes.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/products/types')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No types found.');
            expect(response.body.data).toEqual([]);
            expect(productService.getAllTypes).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/types', async () => {
            productService.getAllTypes.mockRejectedValue(new Error('Failed to retrieve types due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/types')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve types due to a server error.');
            expect(productService.getAllTypes).toHaveBeenCalled();
        });
    });

    describe('getTypesByCategory', () => {
        itWithRoute('should return 200 with types for a category', '/api/v1/products/types/category/:category', async () => {
            const mockTypes = ['Type1', 'Type2'];
            productService.getTypesByCategory.mockResolvedValue(mockTypes);

            const response = await request(app)
                .get('/api/v1/products/types/category/Electronics')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Types retrieved successfully');
            expect(response.body.data).toEqual(mockTypes);
            expect(productService.getTypesByCategory).toHaveBeenCalledWith('Electronics');
        });

        itWithRoute('should return 400 if category is missing', '/api/v1/products/types/category/:category', async () => {
            const response = await request(app)
                .get('/api/v1/products/types/category/%20') // Để trống sau "category/"
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Category is required.');
            expect(productService.getTypesByCategory).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no types found for category', '/api/v1/products/types/category/:category', async () => {
            productService.getTypesByCategory.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/products/types/category/Electronics')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No types found for category Electronics.');
            expect(response.body.data).toEqual([]);
            expect(productService.getTypesByCategory).toHaveBeenCalledWith('Electronics');
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/types/category/:category', async () => {
            productService.getTypesByCategory.mockRejectedValue(new Error('Failed to retrieve types due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/types/category/Electronics')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve types due to a server error.');
            expect(productService.getTypesByCategory).toHaveBeenCalledWith('Electronics');
        });
    });

    describe('getAllCategories', () => {
        itWithRoute('should return 200 with categories', '/api/v1/products/categories', async () => {
            const mockCategories = ['Electronics', 'Clothing'];
            productService.getAllCategories.mockResolvedValue(mockCategories);

            const response = await request(app)
                .get('/api/v1/products/categories')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Categories retrieved successfully');
            expect(response.body.data).toEqual(mockCategories);
            expect(productService.getAllCategories).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no categories found', '/api/v1/products/categories', async () => {
            productService.getAllCategories.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/products/categories')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No categories found.');
            expect(response.body.data).toEqual([]);
            expect(productService.getAllCategories).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/categories', async () => {
            productService.getAllCategories.mockRejectedValue(new Error('Failed to retrieve categories due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/categories')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve categories due to a server error.');
            expect(productService.getAllCategories).toHaveBeenCalled();
        });
    });

    describe('getProductByTypes', () => {
        itWithRoute('should return 200 with products by type', '/api/v1/products/type/:type', async () => {
            const mockResult = {
                products: [{ product_id: 1, name: 'Product 1' }],
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            };
            productService.getProductByTypes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/type/smartphone?page=1')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Products retrieved successfully');
            expect(response.body.data).toEqual(mockResult.products);
            expect(response.body.pagination).toEqual({
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.getProductByTypes).toHaveBeenCalledWith({
                type: 'smartphone',
                page: '1',
                brand: undefined,
                price_min: undefined,
                price_max: undefined,
                rating: undefined,
            });
        });

        itWithRoute('should return 400 if type is missing', '/api/v1/products/type/:type', async () => {
            const response = await request(app)
                .get('/api/v1/products/type/%20') // Để trống sau "type/"
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Type is required.');
            expect(productService.getProductByTypes).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if page is invalid', '/api/v1/products/type/:type', async () => {
            const response = await request(app)
                .get('/api/v1/products/type/Phone?page=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Page must be a valid number.');
            expect(productService.getProductByTypes).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no products found', '/api/v1/products/type/:type', async () => {
            const mockResult = {
                products: [],
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            };
            productService.getProductByTypes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/type/Phone')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No products found for this type.');
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.getProductByTypes).toHaveBeenCalledWith({ type: 'Phone' });
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/type/:type', async () => {
            productService.getProductByTypes.mockRejectedValue(new Error('Failed to retrieve products due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/type/Phone')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve products due to a server error.');
            expect(productService.getProductByTypes).toHaveBeenCalled();
        });
    });

    describe('getProductsByCategories', () => {
        itWithRoute('should return 200 with products by category', '/api/v1/products/category/:category', async () => {
            const mockResult = {
                products: [{ product_id: 1, name: 'Product 1' }],
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            };
            productService.getProductsByCategories.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/category/electronics?page=1')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Products retrieved successfully');
            expect(response.body.data).toEqual(mockResult.products);
            expect(response.body.pagination).toEqual({
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.getProductsByCategories).toHaveBeenCalledWith({
                category: 'electronics',
                type: undefined,
                page: '1',
                brand: undefined,
                price_min: undefined,
                price_max: undefined,
                rating: undefined,
            });
        });

        itWithRoute('should return 400 if category is missing', '/api/v1/products/category/:category', async () => {
            const response = await request(app)
                .get('/api/v1/products/category/%20') // Để trống sau "category/"
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Category is required.');
            expect(productService.getProductsByCategories).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if page is invalid', '/api/v1/products/category/:category', async () => {
            const response = await request(app)
                .get('/api/v1/products/category/Electronics?page=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Page must be a valid number.');
            expect(productService.getProductsByCategories).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no products found', '/api/v1/products/category/:category', async () => {
            const mockResult = {
                products: [],
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            };
            productService.getProductsByCategories.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/category/Electronics')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No products found for this category.');
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.getProductsByCategories).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/category/:category', async () => {
            productService.getProductsByCategories.mockRejectedValue(new Error('Failed to retrieve products due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/category/Electronics')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve products due to a server error.');
            expect(productService.getProductsByCategories).toHaveBeenCalled();
        });
    });

    describe('getRecommendations', () => {
        itWithRoute('should return 200 with recommendations', '/api/v1/products/predict/:product_id', async () => {
            const mockRecommendations = [{ product_id: 2, name: 'Product 2' }];
            productService.getRecommendations.mockResolvedValue(mockRecommendations);

            const response = await request(app)
                .post('/api/v1/products/predict/1')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Recommendations retrieved successfully');
            expect(response.body.data).toEqual(mockRecommendations);
            expect(productService.getRecommendations).toHaveBeenCalledWith('1');
        });

        itWithRoute('should return 400 if product_id is invalid', '/api/v1/products/predict/:product_id', async () => {
            const response = await request(app)
                .post('/api/v1/products/predict/invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID. Must be a number.');
            expect(productService.getRecommendations).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no recommendations found', '/api/v1/products/predict/:product_id', async () => {
            productService.getRecommendations.mockResolvedValue([]);

            const response = await request(app)
                .post('/api/v1/products/predict/1')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No recommendations found.');
            expect(response.body.data).toEqual([]);
            expect(productService.getRecommendations).toHaveBeenCalledWith('1');
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/predict/:product_id', async () => {
            productService.getRecommendations.mockRejectedValue(new Error('Failed to retrieve recommendations due to a server error.'));

            const response = await request(app)
                .post('/api/v1/products/predict/1')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve recommendations due to a server error.');
            expect(productService.getRecommendations).toHaveBeenCalledWith('1');
        });
    });

    describe('sessionBasedRecommendation', () => {
        itWithRoute('should return 200 with session-based recommendations', '/api/v1/products/recommendations', async () => {
            const mockRecommendations = [{ product_id: 2, name: 'Product 2' }];
            productService.sessionBasedRecommendation.mockResolvedValue(mockRecommendations);

            const response = await request(app)
                .post('/api/v1/products/recommendations')
                .send({ user_id: 'user123', product_id: '1' })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Recommendations retrieved successfully');
            expect(response.body.data).toEqual(mockRecommendations);
            expect(productService.sessionBasedRecommendation).toHaveBeenCalledWith({ user_id: 'user123', product_id: '1' });
        });

        itWithRoute('should return 400 if user_id or product_id is missing', '/api/v1/products/recommendations', async () => {
            const response = await request(app)
                .post('/api/v1/products/recommendations')
                .send({ product_id: '1' })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User ID and Product ID are required.');
            expect(productService.sessionBasedRecommendation).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if product_id is invalid', '/api/v1/products/recommendations', async () => {
            const response = await request(app)
                .post('/api/v1/products/recommendations')
                .send({ user_id: 'user123', product_id: 'invalid' })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID. Must be a number.');
            expect(productService.sessionBasedRecommendation).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no recommendations found', '/api/v1/products/recommendations', async () => {
            productService.sessionBasedRecommendation.mockResolvedValue([]);

            const response = await request(app)
                .post('/api/v1/products/recommendations')
                .send({ user_id: 'user123', product_id: '1' })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No recommendations found.');
            expect(response.body.data).toEqual([]);
            expect(productService.sessionBasedRecommendation).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/recommendations', async () => {
            productService.sessionBasedRecommendation.mockRejectedValue(new Error('Failed to retrieve recommendations due to a server error.'));

            const response = await request(app)
                .post('/api/v1/products/recommendations')
                .send({ user_id: 'user123', product_id: '1' })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve recommendations due to a server error.');
            expect(productService.sessionBasedRecommendation).toHaveBeenCalled();
        });
    });

    describe('anonymousRecommendation', () => {
        itWithRoute('should return 200 with anonymous recommendations', '/api/v1/products/anomynus_recommendations', async () => {
            const mockRecommendations = [{ product_id: 2, name: 'Product 2' }];
            productService.anonymousRecommendation.mockResolvedValue(mockRecommendations);

            const response = await request(app)
                .post('/api/v1/products/anomynus_recommendations')
                .send({ product_id: '1' })
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Anonymous recommendations retrieved successfully');
            expect(response.body.data).toEqual(mockRecommendations);
            expect(productService.anonymousRecommendation).toHaveBeenCalledWith('1');
        });

        itWithRoute('should return 400 if product_id is missing', '/api/v1/products/anomynus_recommendations', async () => {
            const response = await request(app)
                .post('/api/v1/products/anomynus_recommendations')
                .send({})
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID. Must be a number.');
            expect(productService.anonymousRecommendation).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if product_id is invalid', '/api/v1/products/anomynus_recommendations', async () => {
            const response = await request(app)
                .post('/api/v1/products/anomynus_recommendations')
                .send({ product_id: 'invalid' })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID. Must be a number.');
            expect(productService.anonymousRecommendation).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no recommendations found', '/api/v1/products/anomynus_recommendations', async () => {
            productService.anonymousRecommendation.mockResolvedValue([]);

            const response = await request(app)
                .post('/api/v1/products/anomynus_recommendations')
                .send({ product_id: '1' })
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No recommendations found.');
            expect(response.body.data).toEqual([]);
            expect(productService.anonymousRecommendation).toHaveBeenCalledWith('1');
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/anomynus_recommendations', async () => {
            productService.anonymousRecommendation.mockRejectedValue(new Error('Failed to retrieve recommendations due to a server error.'));

            const response = await request(app)
                .post('/api/v1/products/anomynus_recommendations')
                .send({ product_id: '1' })
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve recommendations due to a server error.');
            expect(productService.anonymousRecommendation).toHaveBeenCalledWith('1');
        });
    });

    describe('getTopTrendingProducts', () => {
        itWithRoute('should return 200 with trending products', '/api/v1/products/trending', async () => {
            const mockProducts = [{ product_id: 1, name: 'Product 1' }];
            productService.getTopTrendingProducts.mockResolvedValue(mockProducts);

            const response = await request(app)
                .get('/api/v1/products/trending')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Top trending products retrieved successfully');
            expect(response.body.data).toEqual(mockProducts);
            expect(productService.getTopTrendingProducts).toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no trending products found', '/api/v1/products/trending', async () => {
            productService.getTopTrendingProducts.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/products/trending')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No trending products found.');
            expect(response.body.data).toEqual([]);
            expect(productService.getTopTrendingProducts).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/trending', async () => {
            productService.getTopTrendingProducts.mockRejectedValue(new Error('Failed to retrieve trending products due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/trending')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve trending products due to a server error.');
            expect(productService.getTopTrendingProducts).toHaveBeenCalled();
        });
    });

    describe('searchProducts', () => {
        itWithRoute('should return 200 with search results', '/api/v1/products/search', async () => {
            const mockProducts = [{ product_id: 1, name: 'Product 1' }];
            productService.searchProducts.mockResolvedValue(mockProducts);

            const response = await request(app)
                .get('/api/v1/products/search?query=phone')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Search results retrieved successfully');
            expect(response.body.data).toEqual(mockProducts);
            expect(productService.searchProducts).toHaveBeenCalledWith('phone');
        });

        itWithRoute('should return 400 if query is missing', '/api/v1/products/search', async () => {
            const response = await request(app)
                .get('/api/v1/products/search')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Search query is required.');
            expect(productService.searchProducts).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no products found', '/api/v1/products/search', async () => {
            productService.searchProducts.mockResolvedValue([]);

            const response = await request(app)
                .get('/api/v1/products/search?query=phone')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No products found for this query.');
            expect(response.body.data).toEqual([]);
            expect(productService.searchProducts).toHaveBeenCalledWith('phone');
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/search', async () => {
            productService.searchProducts.mockRejectedValue(new Error('Failed to retrieve search results due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/search?query=phone')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve search results due to a server error.');
            expect(productService.searchProducts).toHaveBeenCalledWith('phone');
        });
    });

    describe('searchProductsPaginated', () => {
        itWithRoute('should return 200 with paginated search results', '/api/v1/products/searchFullPage', async () => {
            const mockResult = {
                products: [{ product_id: 1, name: 'Product 1' }],
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            };
            productService.searchProductsPaginated.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/searchFullPage?query=phone&page=1&limit=10')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Search results retrieved successfully');
            expect(response.body.data).toEqual(mockResult.products);
            expect(response.body.pagination).toEqual({
                totalProducts: 1,
                totalPages: 1,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.searchProductsPaginated).toHaveBeenCalledWith({
                query: 'phone',
                page: '1',
                limit: '10',
                brand: undefined,
                price_min: undefined,
                price_max: undefined,
                rating: undefined,
            });
        });

        itWithRoute('should return 400 if query is missing', '/api/v1/products/searchFullPage', async () => {
            const response = await request(app)
                .get('/api/v1/products/searchFullPage')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Search query is required.');
            expect(productService.searchProductsPaginated).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if page is invalid', '/api/v1/products/searchFullPage', async () => {
            const response = await request(app)
                .get('/api/v1/products/searchFullPage?query=phone&page=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Page must be a valid number.');
            expect(productService.searchProductsPaginated).not.toHaveBeenCalled();
        });

        itWithRoute('should return 400 if limit is invalid', '/api/v1/products/searchFullPage', async () => {
            const response = await request(app)
                .get('/api/v1/products/searchFullPage?query=phone&page=1&limit=invalid')
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Limit must be a valid number.');
            expect(productService.searchProductsPaginated).not.toHaveBeenCalled();
        });

        itWithRoute('should return 404 if no products found', '/api/v1/products/searchFullPage', async () => {
            const mockResult = {
                products: [],
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            };
            productService.searchProductsPaginated.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/products/searchFullPage?query=phone')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('No products found for this query.');
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination).toEqual({
                totalProducts: 0,
                totalPages: 0,
                currentPage: 1,
                pageSize: 10,
            });
            expect(productService.searchProductsPaginated).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/products/searchFullPage', async () => {
            productService.searchProductsPaginated.mockRejectedValue(new Error('Failed to retrieve search results due to a server error.'));

            const response = await request(app)
                .get('/api/v1/products/searchFullPage?query=phone')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Failed to retrieve search results due to a server error.');
            expect(productService.searchProductsPaginated).toHaveBeenCalled();
        });
    });
});