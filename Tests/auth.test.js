const supertest = require('supertest');
const mongoose = require('mongoose');
const {generateJwt} = require('../untils/jwt')
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
    let token;
    describe('POST /api/v1/auth/register', () => {
        afterEach(async () => {
            if (createdUser) {
                await User.deleteOne({ _id: createdUser.id });
                createdUser = null; // Reset the variable after deletion
            }
        });

        it('should register a new user successfully', async () => {
            const user = { name: 'Test6', email: 'test8@example.com', password: 'password123' };
            const response = await supertest(app).post('/api/v1/auth/register').send(user);

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.user).toMatchObject({ name: user.name, email: user.email });

            // Store the created user for cleanup
            createdUser = await User.findOne({ email: user.email });
            expect(createdUser).not.toBeNull();
            token=generateJwt(createdUser.id);
            console.log("created test user token:", token);

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

    describe('GET /api/v1/auth/profile', ()=> {
        const token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzQwNDNiOTFjNjQwOGQ3ODNmNjhlZTYiLCJpYXQiOjE3MzI1NTc1MzcsImV4cCI6MTczMjU2MTEzN30.kGscjzsDtyoYVerWunz2SpqFDqqeUi4edr1Qmjc5w3Q";
        it('should return user information when authenticated', async () => {
            const response = await supertest(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);

        })
    })
});