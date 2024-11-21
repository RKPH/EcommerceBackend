require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app'); // Assuming this exports your Express app
const Product = require('../models/products');

// Use your existing database URI
const dbURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

beforeAll(async () => {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Product Controller Tests', () => {
    const productId = '673ea929f15ede4046eb85f4'; // Valid product ID (make sure this exists in your DB)

    // Test: Get all products
    test('GET /api/v1/products/all - Should return all products', async () => {
        const response = await supertest(app).get('/api/v1/products/all');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeInstanceOf(Array);
    });

    // Test: Get product by valid ID
    test('GET /api/v1/products/:id - Should return a product with a valid ID', async () => {
        const response = await supertest(app).get(`/api/v1/products/${productId}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('_id', productId);
    });

    // Test: Get product by invalid ID format
    test('GET /api/v1/products/:id - Should return 400 for invalid product ID format', async () => {
        const invalidId = 'invalidID123'; // Invalid ID format (not a valid MongoDB ObjectId)

        const response = await supertest(app).get(`/api/v1/products/${invalidId}`);

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid product ID format');
    });

    // Test: Get product by non-existing ID (valid format but not in DB)
    test('GET /api/v1/products/:id - Should return 404 for non-existing product ID', async () => {
        const nonExistingId = new mongoose.Types.ObjectId();// Create a new valid ObjectId that doesn't exist in the DB

        const response = await supertest(app).get(`/api/v1/products/${nonExistingId}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe(`Product with ID ${nonExistingId} not found`);
    });

    // Test: Add product with valid data
    test('POST /api/v1/products/addProduct - Should create a new product', async () => {
        const newProduct = {
            name: 'New Product',
            price: 200,
            category: 'Category B',
            subcategory: 'Subcategory B',
            type: 'Type B',
            brand: 'Brand B',
            sport: 'Football',
            image: 'product-image.jpg',
            productImage: ['image1.jpg', 'image2.jpg'],
        };

        const response = await supertest(app).post('/api/v1/products/addProduct').send(newProduct);

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('_id');
        expect(response.body.data).toHaveProperty('name', newProduct.name);
    });

    // Test: Add product with missing required fields
    test('POST /api/v1/products/addProduct - Should return 400 for missing required fields', async () => {
        const incompleteProduct = {
            name: 'Incomplete Product',
            price: 150,
            category: 'Category C',
            subcategory: 'Subcategory C',
        };

        const response = await supertest(app).post('/api/v1/products/addProduct').send(incompleteProduct);

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid product data. Please ensure all required fields are provided and valid.');
    });

    // Test: Add product with invalid price
    test('POST /api/v1/products/addProduct - Should return 400 for invalid price', async () => {
        const invalidProduct = {
            name: 'Invalid Price Product',
            price: -50, // Invalid price
            category: 'Category D',
            subcategory: 'Subcategory D',
            type: 'Type D',
            brand: 'Brand D',
            image: 'invalid-product-image.jpg',
            productImage: ['image1.jpg'],
        };

        const response = await supertest(app).post('/api/v1/products/addProduct').send(invalidProduct);

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid product data. Please ensure all required fields are provided and valid.');
    });
});
