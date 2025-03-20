const request = require('supertest');
const express = require('express');
const multer = require('multer');
const { uploadImageToStorage } = require('../Services/imageService');
const { upload, handleMulterError, uploadImage } = require('../controllers/imageController'); // Adjust path to your controller

// Mock the uploadImageToStorage service
jest.mock('../Services/imageService', () => ({
    uploadImageToStorage: jest.fn(),
}));

// Create an Express app for testing
const app = express();
app.use(express.json());

// Mock multer middleware to simulate file upload
const mockMulter = multer({
    storage: multer.memoryStorage(),
}).single("file");

// Define route for uploadImage controller with error handling
app.post('/api/v1/images/upload', mockMulter, handleMulterError, uploadImage);

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

describe('Upload Controller', () => {
    describe('uploadImage', () => {
        itWithRoute('should return 200 with image URLs on successful upload', '/api/v1/images/upload', async () => {
            const mockResult = {
                imageUrl: 'https://cloudinary.com/test-image.jpg',
                urlMinio: 'https://minio.d2f.io.vn/images/test-image.jpg',
            };
            uploadImageToStorage.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/images/upload')
                .attach('file', Buffer.from('test image content'), 'test-image.jpg')
                .expect(200);

            expect(response.body).toEqual({
                imageUrl: mockResult.imageUrl,
                urlMinio: mockResult.urlMinio,
            });
            expect(uploadImageToStorage).toHaveBeenCalledWith(
                expect.objectContaining({
                    originalname: 'test-image.jpg',
                    buffer: expect.any(Buffer),
                    mimetype: 'image/jpeg',
                })
            );
        });

        itWithRoute('should return 400 if no file is uploaded', '/api/v1/images/upload', async () => {
            const response = await request(app)
                .post('/api/v1/images/upload')
                .expect(400);

            expect(response.body).toEqual({
                error: 'No file uploaded',
            });
            expect(uploadImageToStorage).not.toHaveBeenCalled();
        });

        itWithRoute('should return 500 if the service throws an error', '/api/v1/images/upload', async () => {
            uploadImageToStorage.mockRejectedValue(new Error('Image upload failed'));

            const response = await request(app)
                .post('/api/v1/images/upload')
                .attach('file', Buffer.from('test image content'), 'test-image.jpg')
                .expect(500);

            expect(response.body).toEqual({
                error: 'Image upload failed',
            });
            expect(uploadImageToStorage).toHaveBeenCalledWith(
                expect.objectContaining({
                    originalname: 'test-image.jpg',
                    buffer: expect.any(Buffer),
                    mimetype: 'image/jpeg',
                })
            );
        });
    });
});