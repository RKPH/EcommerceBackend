// utils/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Ecommerce API',
            version: '1.0.0',
            description: 'A simple Express API with Swagger documentation',
        },
        servers: [
            {
                url: 'https://backend.d2f.io.vn', // Adjust if your app uses a different port
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'https',
                    scheme: 'bearer',
                    bearerFormat: 'JWT', // Optional, can help Swagger UI understand the token format
                },
            },
        },
    },
    apis: ['./routes/*.js'], // Path to your route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI endpoint setup
const swaggerSetup = swaggerUi.serve;
const swaggerDocs = swaggerUi.setup(swaggerSpec);

module.exports = { swaggerSetup, swaggerDocs };
