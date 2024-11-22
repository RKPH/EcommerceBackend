const supertest = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user'); // Assuming you have a User model

const dbURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

beforeAll(async () => {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Auth Routes', () => {
    let createdUser; // Variable to store the created user for register tests

    describe('POST /api/v1/auth/register', () => {
        afterEach(async () => {
            if (createdUser) {
                await User.deleteOne({ _id: createdUser._id });
                createdUser = null; // Reset the variable after deletion
            }
        });

        it('should register a new user successfully', async () => {
            const user = { name: 'Test6', email: 'test6@example.com', password: 'password123' };
            const response = await supertest(app).post('/api/v1/auth/register').send(user);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.user).toMatchObject({ name: user.name, email: user.email });

            // Store the created user for cleanup
            createdUser = await User.findOne({ email: user.email });
            expect(createdUser).not.toBeNull();
        });

        it('should fail when email already exists', async () => {
            const user = { name: 'Test', email: 'test@example.com', password: 'password123' };
            const response = await supertest(app).post('/api/v1/auth/register').send(user);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User already exists');
        });

        it('should fail when required fields are missing', async () => {
            const response = await supertest(app).post('/api/v1/auth/register').send({ email: 'test@example.com' });
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const loginData = { email: 'test@example.com', password: 'password123' };
            const response = await supertest(app).post('/api/v1/auth/login').send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.user).toMatchObject({ email: loginData.email });
        });

        it('should fail with incorrect password', async () => {
            const loginData = { email: 'test@example.com', password: 'wrongpassword' };
            const response = await supertest(app).post('/api/v1/auth/login').send(loginData);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
        });

        it('should fail with non-existent email', async () => {
            const loginData = { email: 'notexist@example.com', password: 'password123' };
            const response = await supertest(app).post('/api/v1/auth/login').send(loginData);

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
        });

        it('should fail when required fields are missing', async () => {
            const response = await supertest(app).post('/api/v1/auth/login').send({ email: 'test@example.com' });
            expect(response.status).toBe(400);
        });
    });
});
