const request = require('supertest');
const express = require('express');

const shippingAddressController = require('../controllers/AddressController'); // Adjust path
const shippingAddressService = require('../Services/addressService');

// Mock shippingAddressService
jest.mock('../Services/addressService', () => ({
    addShippingAddress: jest.fn(),
    getShippingAddresses: jest.fn(),
    updateShippingAddress: jest.fn(),
    deleteShippingAddress: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Middleware to mock authenticated user
const mockAuthMiddleware = (req, res, next) => {
    req.user = req.user || { userId: 'user123' };
    next();
};

// Define routes with base path /api/v1/address
app.use('/api/v1/address', [
    express.Router()
        .post('/add', mockAuthMiddleware, shippingAddressController.addShippingAddress),
    express.Router()
        .get('/', mockAuthMiddleware, shippingAddressController.getShippingAddresses),
    express.Router()
        .put('/update', mockAuthMiddleware, shippingAddressController.updateShippingAddress),
    express.Router()
        .delete('/delete/:addressId', mockAuthMiddleware, shippingAddressController.deleteShippingAddress),
]);



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

describe('Shipping Address Controller', () => {
    describe('addShippingAddress', () => {
        const addressData = {
            street: '123 Main St',
            city: 'Hanoi',
            cityCode: 'HN',
            district: 'Ba Dinh',
            districtCode: 'BD',
            ward: 'Truc Bach',
            wardCode: 'TB',
            phoneNumber: '1234567890'
        };

        itWithRoute('should return 201 on successful addition', '/api/v1/address/add', async () => {
            const mockShippingAddress = { user: 'user123', addresses: [addressData] };
            shippingAddressService.addShippingAddress.mockResolvedValue(mockShippingAddress);

            const response = await request(app)
                .post('/api/v1/address/add')
                .send(addressData)
                .expect(201);

            expect(response.body.message).toBe('Shipping address added successfully');
            expect(response.body.shippingAddress).toEqual(mockShippingAddress);
            expect(shippingAddressService.addShippingAddress).toHaveBeenCalledWith('user123', addressData);
        });

        itWithRoute('should return 400 if fields are missing', '/api/v1/address/add', async () => {
            shippingAddressService.addShippingAddress.mockRejectedValue(new Error('All address fields are required'));

            const response = await request(app)
                .post('/api/v1/address/add')
                .send({ street: '123 Main St' }) // Missing other fields
                .expect(400);

            expect(response.body.message).toBe('All address fields are required');
        });

        itWithRoute('should return 400 on validation error', '/api/v1/address/add', async () => {
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            validationError.errors = { phoneNumber: { message: 'Invalid phone' } };
            shippingAddressService.addShippingAddress.mockRejectedValue(validationError);

            const response = await request(app)
                .post('/api/v1/address/add')
                .send(addressData)
                .expect(400);

            expect(response.body.message).toBe('Validation failed');
            expect(response.body.errors).toBeDefined();
        });

        itWithRoute('should return 500 on server error', '/api/v1/address/add', async () => {
            shippingAddressService.addShippingAddress.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .post('/api/v1/address/add')
                .send(addressData)
                .expect(500);

            expect(response.body.message).toBe('Server error');
        });
    });

    describe('getShippingAddresses', () => {
        itWithRoute('should return 200 with addresses', '/api/v1/address', async () => {
            const mockAddresses = [{ street: '123 Main St', city: 'Hanoi' }];
            shippingAddressService.getShippingAddresses.mockResolvedValue(mockAddresses);

            const response = await request(app)
                .get('/api/v1/address')
                .expect(200);

            expect(response.body.addresses).toEqual(mockAddresses);
            expect(shippingAddressService.getShippingAddresses).toHaveBeenCalledWith('user123');
        });

        itWithRoute('should return 404 if no addresses found', '/api/v1/address', async () => {
            shippingAddressService.getShippingAddresses.mockRejectedValue(new Error('No shipping addresses found'));

            const response = await request(app)
                .get('/api/v1/address')
                .expect(404);

            expect(response.body.message).toBe('No shipping addresses found');
        });

        itWithRoute('should return 500 on server error', '/api/v1/address', async () => {
            shippingAddressService.getShippingAddresses.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/v1/address')
                .expect(500);

            expect(response.body.message).toBe('Server error');
        });
    });

    describe('updateShippingAddress', () => {
        const updateData = {
            addressId: 'addr123',
            street: '456 New St',
            city: 'Hanoi',
            cityCode: 'HN',
            district: 'Ba Dinh',
            districtCode: 'BD',
            ward: 'Truc Bach',
            wardCode: 'TB',
            phoneNumber: '0987654321'
        };

        itWithRoute('should return 200 on successful update', '/api/v1/address/update', async () => {
            const mockUpdatedAddress = { _id: 'addr123', street: '456 New St', city: 'Hanoi' };
            shippingAddressService.updateShippingAddress.mockResolvedValue(mockUpdatedAddress);

            const response = await request(app)
                .put('/api/v1/address/update')
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Shipping address updated successfully');
            expect(response.body.updatedAddress).toEqual(mockUpdatedAddress);
            expect(shippingAddressService.updateShippingAddress).toHaveBeenCalledWith('user123', 'addr123', {
                street: '456 New St',
                city: 'Hanoi',
                cityCode: 'HN',
                district: 'Ba Dinh',
                districtCode: 'BD',
                ward: 'Truc Bach',
                wardCode: 'TB',
                phoneNumber: '0987654321'
            });
        });

        itWithRoute('should return 404 if no addresses found', '/api/v1/address/update', async () => {
            shippingAddressService.updateShippingAddress.mockRejectedValue(new Error('No shipping addresses found for this user'));

            const response = await request(app)
                .put('/api/v1/address/update')
                .send(updateData)
                .expect(404);

            expect(response.body.message).toBe('No shipping addresses found for this user');
        });

        itWithRoute('should return 404 if address not found', '/api/v1/address/update', async () => {
            shippingAddressService.updateShippingAddress.mockRejectedValue(new Error('Address not found'));

            const response = await request(app)
                .put('/api/v1/address/update')
                .send(updateData)
                .expect(404);

            expect(response.body.message).toBe('Address not found');
        });

        itWithRoute('should return 500 on server error', '/api/v1/address/update', async () => {
            shippingAddressService.updateShippingAddress.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .put('/api/v1/address/update')
                .send(updateData)
                .expect(500);

            expect(response.body.message).toBe('Server error while updating address');
        });
    });

    describe('deleteShippingAddress', () => {
        itWithRoute('should return 200 on successful deletion', '/api/v1/address/delete/:addressId', async () => {
            const mockShippingAddress = { user: 'user123', addresses: [] };
            shippingAddressService.deleteShippingAddress.mockResolvedValue(mockShippingAddress);

            const response = await request(app)
                .delete('/api/v1/address/delete/addr123')
                .expect(200);

            expect(response.body.message).toBe('Shipping address deleted successfully');
            expect(response.body.shippingAddress).toEqual(mockShippingAddress);
            expect(shippingAddressService.deleteShippingAddress).toHaveBeenCalledWith('user123', 'addr123');
        });

        itWithRoute('should return 404 if no addresses found', '/api/v1/address/delete/:addressId', async () => {
            shippingAddressService.deleteShippingAddress.mockRejectedValue(new Error('No shipping addresses found'));

            const response = await request(app)
                .delete('/api/v1/address/delete/addr123')
                .expect(404);

            expect(response.body.message).toBe('No shipping addresses found');
        });

        itWithRoute('should return 404 if address not found', '/api/v1/address/delete/:addressId', async () => {
            shippingAddressService.deleteShippingAddress.mockRejectedValue(new Error('Address not found'));

            const response = await request(app)
                .delete('/api/v1/address/delete/addr123')
                .expect(404);

            expect(response.body.message).toBe('Address not found');
        });

        itWithRoute('should return 500 on server error', '/api/v1/address/delete/:addressId', async () => {
            shippingAddressService.deleteShippingAddress.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .delete('/api/v1/address/delete/addr123')
                .expect(500);

            expect(response.body.message).toBe('Server error');
        });
    });
});