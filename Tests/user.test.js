const request = require('supertest');
const express = require('express');

const userController = require('../controllers/UserController'); // Adjust path
const userService = require('../Services/userService');

// Mock userService
jest.mock('../Services/userService', () => ({
    getAllUsers: jest.fn(),
    getUserDetails: jest.fn(),
    updateUser: jest.fn(),
    createUser: jest.fn(),
    updateUserProfile: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Middleware to mock authenticated user for protected routes
const mockAuthMiddleware = (req, res, next) => {
    req.user = req.user || { userId: 'user123' };
    next();
};

// Define routes for userController directly on the app
app.get('/api/v1/users', mockAuthMiddleware, userController.getAllUsers);
app.get('/api/v1/users/:id', mockAuthMiddleware, userController.getUserDetails);
app.put('/api/v1/users/profile', mockAuthMiddleware, userController.updateUserProfile); // Moved before /:id
app.put('/api/v1/users/:id', mockAuthMiddleware, userController.updateUser);
app.post('/api/v1/users/add', mockAuthMiddleware, userController.createUser);


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

describe('User Controller', () => {
    describe('getAllUsers', () => {
        itWithRoute('should return 200 with users and pagination', '/api/v1/users', async () => {
            const mockResult = {
                users: [{ user_id: 123, name: 'John' }],
                pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
            };
            userService.getAllUsers.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/api/v1/users?page=1&limit=10&search=John&role=customer')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.data).toEqual(mockResult.users);
            expect(response.body.pagination).toEqual(mockResult.pagination);
            expect(userService.getAllUsers).toHaveBeenCalledWith(1, 10, 'John', 'customer');
        });

        itWithRoute('should return 500 on server error', '/api/v1/users', async () => {
            userService.getAllUsers.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/v1/users')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database error');
        });
    });

    describe('getUserDetails', () => {
        itWithRoute('should return 200 with user details', '/api/v1/users/:id', async () => {
            const mockUser = { user_id: 123, name: 'John' };
            userService.getUserDetails.mockResolvedValue(mockUser);

            const response = await request(app)
                .get('/api/v1/users/123')
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User details retrieved successfully.');
            expect(response.body.data).toEqual(mockUser);
            expect(userService.getUserDetails).toHaveBeenCalledWith('123');
        });

        itWithRoute('should return 404 if user not found', '/api/v1/users/:id', async () => {
            userService.getUserDetails.mockRejectedValue(new Error('User not found.'));

            const response = await request(app)
                .get('/api/v1/users/999')
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found.');
        });

        itWithRoute('should return 500 on server error', '/api/v1/users/:id', async () => {
            userService.getUserDetails.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/v1/users/123')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database error');
        });
    });

    describe('updateUser', () => {
        const updateData = { name: 'John Doe', email: 'john@example.com' };

        itWithRoute('should return 200 on successful update', '/api/v1/users/:id', async () => {
            const mockUpdatedUser = { user_id: 123, name: 'John Doe', email: 'john@example.com' };
            userService.updateUser.mockResolvedValue(mockUpdatedUser);

            const response = await request(app)
                .put('/api/v1/users/123')
                .send(updateData)
                .expect(200);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User updated successfully.');
            expect(response.body.data).toEqual(mockUpdatedUser);
            expect(userService.updateUser).toHaveBeenCalledWith('123', updateData);
        });

        itWithRoute('should return 400 if name and email missing', '/api/v1/users/:id', async () => {
            userService.updateUser.mockRejectedValue(new Error('Name and email are required.'));

            const response = await request(app)
                .put('/api/v1/users/123')
                .send({})
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Name and email are required.');
        });

        itWithRoute('should return 404 if user not found', '/api/v1/users/:id', async () => {
            userService.updateUser.mockRejectedValue(new Error('User not found.'));

            const response = await request(app)
                .put('/api/v1/users/999')
                .send(updateData)
                .expect(404);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('User not found.');
        });

        itWithRoute('should return 400 if email in use', '/api/v1/users/:id', async () => {
            userService.updateUser.mockRejectedValue(new Error('Email is already in use by another user.'));

            const response = await request(app)
                .put('/api/v1/users/123')
                .send(updateData)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Email is already in use by another user.');
        });

        itWithRoute('should return 500 on server error', '/api/v1/users/:id', async () => {
            userService.updateUser.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/api/v1/users/123')
                .send(updateData)
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database error');
        });
    });

    describe('createUser', () => {
        const userData = { name: 'Jane', email: 'jane@example.com', password: 'password123' };

        itWithRoute('should return 201 on successful creation', '/api/v1/users/add', async () => {
            const mockNewUser = { user_id: 124, name: 'Jane', email: 'jane@example.com' };
            userService.createUser.mockResolvedValue(mockNewUser);

            const response = await request(app)
                .post('/api/v1/users/add')
                .send(userData)
                .expect(201);

            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('User created successfully.');
            expect(response.body.data).toEqual(mockNewUser);
            expect(userService.createUser).toHaveBeenCalledWith(userData);
        });

        itWithRoute('should return 400 if required fields missing', '/api/v1/users/add', async () => {
            userService.createUser.mockRejectedValue(new Error('Name, email, and password are required.'));

            const response = await request(app)
                .post('/api/v1/users/add')
                .send({ name: 'Jane' })
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Name, email, and password are required.');
        });

        itWithRoute('should return 400 if email in use', '/api/v1/users/add', async () => {
            userService.createUser.mockRejectedValue(new Error('Email is already in use by another user.'));

            const response = await request(app)
                .post('/api/v1/users/add')
                .send(userData)
                .expect(400);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Email is already in use by another user.');
        });

        itWithRoute('should return 500 on server error', '/api/v1/users/add', async () => {
            userService.createUser.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/v1/users/add')
                .send(userData)
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBe('Database error');
        });
    });

    describe('updateUserProfile', () => {
        const profileData = { name: 'Jane Doe', email: 'jane.doe@example.com', avatar: 'avatar.jpg' };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        itWithRoute('should return 200 on successful profile update', '/api/v1/users/profile', async () => {
            const mockResult = {
                message: 'User profile updated successfully',
                user: {
                    name: 'Jane Doe',
                    email: 'jane.doe@example.com',
                    avatar: 'avatar.jpg',
                    role: 'user',
                    createdAt: '2025-03-19T11:47:54.000Z',
                    updatedAt: '2025-03-19T12:00:00.000Z',
                },
            };
            userService.updateUserProfile.mockResolvedValue(mockResult);

            const response = await request(app)
                .put('/api/v1/users/profile')
                .send(profileData)
                .expect(200);

            expect(response.body.message).toBe('User profile updated successfully');
            expect(response.body.user).toEqual(mockResult.user);
            expect(userService.updateUserProfile).toHaveBeenCalledWith('user123', profileData);
        });

        itWithRoute('should return 404 if user not found', '/api/v1/users/profile', async () => {
            userService.updateUserProfile.mockRejectedValue(new Error('User not found'));

            const response = await request(app)
                .put('/api/v1/users/profile')
                .send(profileData)
                .expect(404);

            expect(response.body.message).toBe('User not found');
            expect(userService.updateUserProfile).toHaveBeenCalled();
        });

        itWithRoute('should return 400 if email in use', '/api/v1/users/profile', async () => {
            userService.updateUserProfile.mockRejectedValue(new Error('Email is already in use'));

            const response = await request(app)
                .put('/api/v1/users/profile')
                .send(profileData)
                .expect(400);

            expect(response.body.message).toBe('Email is already in use');
            expect(userService.updateUserProfile).toHaveBeenCalled();
        });

        itWithRoute('should return 500 on server error', '/api/v1/users/profile', async () => {
            userService.updateUserProfile.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/api/v1/users/profile')
                .send(profileData)
                .expect(500);

            expect(response.body.message).toBe('Database error');
            expect(userService.updateUserProfile).toHaveBeenCalled();
        });
    });
});