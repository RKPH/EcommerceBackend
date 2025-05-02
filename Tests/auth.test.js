const request = require('supertest');
const express = require('express');

const authController = require('../controllers/authController');
const authService = require('../Services/authService');
const { verifyRefreshToken } = require('../utils/jwt');

// Mock authService
jest.mock('../Services/authService', () => ({
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    loginAdminService: jest.fn(), // Add loginAdminService to the mock
    verifyUser: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getUserProfile: jest.fn(),
    refreshAccessToken: jest.fn(),
}));

// Mock verifyRefreshToken
jest.mock('../utils/jwt', () => ({
    verifyRefreshToken: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Define routes for authController
app.post('/api/v1/auth/register', authController.registerUser);
app.post('/api/v1/auth/login', authController.loginUser);
app.post('/api/v1/auth/admin-login', authController.loginAdmin); // Add admin login route

// Middleware to mock authenticated user for private routes
const mockAuthMiddleware = (req, res, next) => {
    req.user = req.user || { userId: 1, sessionID: 'session123' };
    next();
};

app.post('/api/v1/auth/verify', mockAuthMiddleware, authController.verifyUser);
app.post('/api/v1/auth/forgot-password', authController.forgotPassword);
app.post('/api/v1/auth/reset-password', authController.resetPassword);
app.get('/api/v1/auth/profile', mockAuthMiddleware, authController.getUserProfile);
app.post('/api/v1/auth/refresh-token', authController.refreshAccessToken);
app.post('/api/v1/auth/logout', mockAuthMiddleware, authController.logoutUser);


beforeEach(() => {
    jest.clearAllMocks();
});

// Helper to define tests with route metadata
const itWithRoute = (description, route, testFn) => {
    it(description, async () => {
        const result = testFn();
        // Attach route metadata to the test context
        Object.defineProperty(result, 'route', {
            value: route,
            enumerable: true,
        });
        await result;
    });
};

describe('Auth Controller', () => {
    describe('registerUser', () => {
        itWithRoute('should return 201 with user data and tokens on successful registration', '/api/v1/auth/register', async () => {
            const mockResult = {
                token: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 1, name: 'Test User' },
            };
            authService.registerUser.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })
                .expect(201);

            expect(response.body.message).toBe('User registered successfully');
            expect(response.body).toEqual({
                message: 'User registered successfully',
                token: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 1, name: 'Test User' },
            });
            expect(authService.registerUser).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });
            expect(response.header['set-cookie']).toBeDefined();
        });

        itWithRoute('should return 400 if user already exists', '/api/v1/auth/register', async () => {
            authService.registerUser.mockRejectedValue(new Error('User already exists'));

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })
                .expect(400);

            expect(response.body.message).toBe('User already exists');
            expect(authService.registerUser).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/register', async () => {
            authService.registerUser.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({ name: 'Test User', email: 'test@example.com', password: 'password123' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.registerUser).toHaveBeenCalled();
        });
    });

    describe('loginUser', () => {
        itWithRoute('should return 200 with user data and tokens on successful login', '/api/v1/auth/login', async () => {
            const mockResult = {
                token: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 1, name: 'Test User' },
            };
            authService.loginUser.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'test@example.com', password: 'password123' })
                .expect(200);

            expect(response.body.message).toBe('Login successful');
            expect(response.body).toEqual({
                message: 'Login successful',
                token: 'access-token',
                refreshToken: 'refresh-token',
                user: { id: 1, name: 'Test User' },
            });
            expect(authService.loginUser).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(response.header['set-cookie']).toBeDefined();
        });

        itWithRoute('should return 401 for invalid credentials', '/api/v1/auth/login', async () => {
            authService.loginUser.mockRejectedValue(new Error('Invalid email or password'));

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'test@example.com', password: 'wrong' })
                .expect(401);

            expect(response.body.message).toBe('Invalid email or password');
            expect(authService.loginUser).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/login', async () => {
            authService.loginUser.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'test@example.com', password: 'password123' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.loginUser).toHaveBeenCalled();
        });
    });

    // Add test cases for loginAdmin
    describe('loginAdmin', () => {
        itWithRoute('should return 200 with user data and tokens on successful admin login', '/api/v1/auth/admin-login', async () => {
            const mockResult = {
                token: 'admin-access-token',
                refreshToken: 'admin-refresh-token',
                sessionID: 'admin-session123',
                user: {
                    id: 'admin123',
                    sessionID: 'admin-session123',
                    user_id: 'user123',
                    avatar: 'avatar.jpg',
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'admin',
                },
            };
            authService.loginAdminService.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'admin@example.com', password: 'adminpassword123' })
                .expect(200);

            expect(response.body.message).toBe('Admin login successful');
            expect(response.body).toEqual({
                message: 'Admin login successful',
                token: 'admin-access-token',
                refreshToken: 'admin-refresh-token',
                user: {
                    id: 'admin123',
                    sessionID: 'admin-session123',
                    user_id: 'user123',
                    avatar: 'avatar.jpg',
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: 'admin',
                },
            });
            expect(authService.loginAdminService).toHaveBeenCalledWith('admin@example.com', 'adminpassword123');
            expect(response.header['set-cookie']).toBeDefined();
        });

        itWithRoute('should return 400 if email or password is missing', '/api/v1/auth/admin-login', async () => {
            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'admin@example.com' }) // Missing password
                .expect(400);

            expect(response.body.message).toBe('Please provide password.');
            expect(authService.loginAdminService).not.toHaveBeenCalled();
        });

        itWithRoute('should return 401 for invalid email or password', '/api/v1/auth/admin-login', async () => {
            authService.loginAdminService.mockRejectedValue(new Error('Invalid email or password'));

            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'admin@example.com', password: 'wrongpassword' })
                .expect(401);

            expect(response.body.message).toBe('Invalid email or password');
            expect(authService.loginAdminService).toHaveBeenCalledWith('admin@example.com', 'wrongpassword');
        });

        itWithRoute('should return 403 if user is not an admin', '/api/v1/auth/admin-login', async () => {
            authService.loginAdminService.mockRejectedValue(new Error('Access denied. Only admins can log in.'));

            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'user@example.com', password: 'password123' })
                .expect(403);

            expect(response.body.message).toBe('Access denied. Only admins can log in.');
            expect(authService.loginAdminService).toHaveBeenCalledWith('user@example.com', 'password123');
        });

        itWithRoute('should return 403 if account is not verified', '/api/v1/auth/admin-login', async () => {
            authService.loginAdminService.mockRejectedValue(new Error('Account not verified. Please check your email to verify your account.'));

            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'admin@example.com', password: 'adminpassword123' })
                .expect(403);

            expect(response.body.message).toBe('Account not verified. Please check your email to verify your account.');
            expect(authService.loginAdminService).toHaveBeenCalledWith('admin@example.com', 'adminpassword123');
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/admin-login', async () => {
            authService.loginAdminService.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/admin-login')
                .send({ email: 'admin@example.com', password: 'adminpassword123' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.loginAdminService).toHaveBeenCalledWith('admin@example.com', 'adminpassword123');
        });
    });

    describe('verifyUser', () => {
        itWithRoute('should return 200 on successful verification', '/api/v1/auth/verify', async () => {
            const mockResult = { user: { id: 1, name: 'Test User' } };
            authService.verifyUser.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/verify')
                .send({ verificationCode: '123456' })
                .expect(200);

            expect(response.body.message).toBe('User verified successfully');
            expect(response.body.user).toEqual(mockResult.user);
            expect(authService.verifyUser).toHaveBeenCalledWith({ userId: 1, verificationCode: '123456' });
        });

        itWithRoute('should return 400 for invalid verification code', '/api/v1/auth/verify', async () => {
            authService.verifyUser.mockRejectedValue(new Error('Invalid verification code'));

            const response = await request(app)
                .post('/api/v1/auth/verify')
                .send({ verificationCode: 'wrong' })
                .expect(400);

            expect(response.body.message).toBe('Invalid verification code');
            expect(authService.verifyUser).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/verify', async () => {
            authService.verifyUser.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/verify')
                .send({ verificationCode: '123456' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.verifyUser).toHaveBeenCalled();
        });
    });

    describe('forgotPassword', () => {
        itWithRoute('should return 200 on successful forgot password request', '/api/v1/auth/forgot-password', async () => {
            const mockResult = { message: 'Email sent' };
            authService.forgotPassword.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'test@example.com' })
                .expect(200);

            expect(response.body.message).toBe('Email sent');
            expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
        });

        itWithRoute('should return 404 if user not found', '/api/v1/auth/forgot-password', async () => {
            authService.forgotPassword.mockRejectedValue(new Error('User not found'));

            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'nonexistent@example.com' })
                .expect(404);

            expect(response.body.message).toBe('User not found');
            expect(authService.forgotPassword).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/forgot-password', async () => {
            authService.forgotPassword.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'test@example.com' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.forgotPassword).toHaveBeenCalled();
        });
    });

    describe('resetPassword', () => {
        itWithRoute('should return 200 on successful password reset', '/api/v1/auth/reset-password', async () => {
            const mockResult = { message: 'Password reset successful' };
            authService.resetPassword.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ token: 'reset-token', password: 'newpassword123' })
                .expect(200);

            expect(response.body.message).toBe('Password reset successful');
            expect(authService.resetPassword).toHaveBeenCalledWith({ token: 'reset-token', password: 'newpassword123' });
        });

        itWithRoute('should return 400 for invalid token', '/api/v1/auth/reset-password', async () => {
            authService.resetPassword.mockRejectedValue(new Error('Invalid token'));

            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ token: 'invalid-token', password: 'newpassword123' })
                .expect(400);

            expect(response.body.message).toBe('Invalid token');
            expect(authService.resetPassword).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/reset-password', async () => {
            authService.resetPassword.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({ token: 'reset-token', password: 'newpassword123' })
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.resetPassword).toHaveBeenCalled();
        });
    });

    describe('getUserProfile', () => {
        itWithRoute('should return 200 with user profile data', '/api/v1/auth/profile', async () => {
            const mockResult = { user: { id: 1, name: 'Test User' } };
            authService.getUserProfile.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/auth/profile')
                .expect(200);

            expect(response.body.message).toBe('User profile fetched successfully');
            expect(response.body.user).toEqual(mockResult.user);
            expect(authService.getUserProfile).toHaveBeenCalledWith({ userId: 1, sessionID: 'session123' });
        });

        itWithRoute('should return 404 if user not found', '/api/v1/auth/profile', async () => {
            authService.getUserProfile.mockRejectedValue(new Error('User not found'));

            const response = await request(app)
                .get('/api/v1/auth/profile')
                .expect(404);

            expect(response.body.message).toBe('User not found');
            expect(authService.getUserProfile).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/profile', async () => {
            authService.getUserProfile.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .get('/api/v1/auth/profile')
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(authService.getUserProfile).toHaveBeenCalled();
        });
    });

    describe('refreshAccessToken', () => {
        itWithRoute('should return 200 with new tokens when refresh token is valid (via header)', '/api/v1/auth/refresh-token', async () => {
            verifyRefreshToken.mockReturnValue({ userId: 1, sessionID: 'session123' });
            const mockResult = {
                accessToken: 'new-access-token',
                newRefreshToken: 'new-refresh-token',
            };
            authService.refreshAccessToken.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('Authorization', 'Bearer refresh-token')
                .expect(200);

            expect(response.body.message).toBe('New access token generated successfully');
            expect(response.body.token).toBe('new-access-token');
            expect(response.body.refreshToken).toBe('new-refresh-token');
            expect(verifyRefreshToken).toHaveBeenCalledWith('refresh-token');
            expect(authService.refreshAccessToken).toHaveBeenCalledWith({ userId: 1, sessionID: 'session123' });
            expect(response.header['set-cookie']).toBeDefined();
        });

        itWithRoute('should return 401 if no refresh token provided', '/api/v1/auth/refresh-token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .expect(401);

            expect(response.body.message).toBe('Please provide a refresh token.');
            expect(verifyRefreshToken).not.toHaveBeenCalled();
            expect(authService.refreshAccessToken).not.toHaveBeenCalled();
        });

        itWithRoute('should return 401 if refresh token is invalid', '/api/v1/auth/refresh-token', async () => {
            verifyRefreshToken.mockReturnValue(null);

            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.message).toBe('Invalid or expired refresh token');
            expect(verifyRefreshToken).toHaveBeenCalledWith('invalid-token');
            expect(authService.refreshAccessToken).not.toHaveBeenCalled();
        });

        itWithRoute('should return 500 on service error', '/api/v1/auth/refresh-token', async () => {
            verifyRefreshToken.mockReturnValue({ userId: 1, sessionID: 'session123' });
            authService.refreshAccessToken.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .post('/api/v1/auth/refresh-token')
                .set('Authorization', 'Bearer refresh-token')
                .expect(500);

            expect(response.body.message).toBe('Server error');
            expect(verifyRefreshToken).toHaveBeenCalled();
            expect(authService.refreshAccessToken).toHaveBeenCalled();
        });
    });

    describe('logoutUser', () => {
        itWithRoute('should return 200 on successful logout', '/api/v1/auth/logout', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .expect(200);

            expect(response.body.message).toBe('Logout successful');
            expect(response.header['set-cookie']).toBeDefined(); // Cookies should be cleared
        });

        itWithRoute('should return 500 on error during logout', '/api/v1/auth/logout', async () => {
            // Simulate an error by mocking express response to throw on clearCookie
            const originalClearCookie = app.response.clearCookie;
            app.response.clearCookie = jest.fn(() => { throw new Error('Clear cookie error'); });

            const response = await request(app)
                .post('/api/v1/auth/logout')
                .expect(500);

            expect(response.body.message).toBe('Server error during logout');

            // Restore original clearCookie
            app.response.clearCookie = originalClearCookie;
        });
    });
});