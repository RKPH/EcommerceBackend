require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../app');
const Product = require('../models/products'); // Assuming you have a Product model

// Database URI from environment variables
const dbURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

beforeAll(async () => {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Product Controller Tests', () => {
    let createdProduct; // Variable to store the created product for cleanup after each test

    afterEach(async () => {
        if (createdProduct) {
            await Product.deleteOne({ _id: createdProduct._id });
            createdProduct = null; // Reset the variable
        }
    });

    describe('GET /api/v1/products/all', () => {
        it('should return all products', async () => {
            const response = await supertest(app).get('/api/v1/products/all');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toBeInstanceOf(Array);
        });
    });

    describe('GET /api/v1/products/:id', () => {
        const productId = '673ea929f15ede4046eb85f4'; // Replace with a valid product ID from your DB

        it('should return a product with a valid ID', async () => {
            const response = await supertest(app).get(`/api/v1/products/${productId}`);
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('_id', productId);
        });

        it('should return 400 for invalid product ID format', async () => {
            const invalidId = 'invalidID123';
            const response = await supertest(app).get(`/api/v1/products/${invalidId}`);
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product ID format');
        });

        it('should return 404 for non-existing product ID', async () => {
            const nonExistingId = new mongoose.Types.ObjectId();
            const response = await supertest(app).get(`/api/v1/products/${nonExistingId}`);
            expect(response.status).toBe(404);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe(`Product with ID ${nonExistingId} not found`);
        });
    });

    describe('POST /api/v1/products/addProduct', () => {
        it('should create a new product with valid data', async () => {
            const newProduct = {
                name: 'Test Product',
                price: 100,
                category: 'Category A',
                subcategory: 'Subcategory A',
                type: 'Type A',
                brand: 'Brand A',
                sport: 'Tennis',
                image: 'product-image.jpg',
                productImage: ['image1.jpg', 'image2.jpg'],
            };

            const response = await supertest(app).post('/api/v1/products/addProduct').send(newProduct);
            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('_id');
            expect(response.body.data).toHaveProperty('name', newProduct.name);

            // Store the created product for cleanup
            createdProduct = await Product.findById(response.body.data._id);
            expect(createdProduct).not.toBeNull();
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteProduct = {
                name: 'Incomplete Product',
                price: 150,
                category: 'Category C',
            };

            const response = await supertest(app).post('/api/v1/products/addProduct').send(incompleteProduct);
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product data. Please ensure all required fields are provided and valid.');
        });

        it('should return 400 for invalid price', async () => {
            const invalidProduct = {
                name: 'Invalid Price Product',
                price: -50,
                category: 'Category D',
                subcategory: 'Subcategory D',
                type: 'Type D',
                brand: 'Brand D',
                sport: 'Running',
                image: 'invalid-product-image.jpg',
                productImage: ['image1.jpg'],
            };

            const response = await supertest(app).post('/api/v1/products/addProduct').send(invalidProduct);
            expect(response.status).toBe(400);
            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Invalid product data. Please ensure all required fields are provided and valid.');
        });
    });
});
