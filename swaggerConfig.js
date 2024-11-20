const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Product API',
        description: 'API for managing products',
    },
    host: 'localhost:3000', // Change as needed
    schemes: ['http'],
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/product.js']; // Path to your route files

// Generate the Swagger output file
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./app'); // Start the app after generating the docs
});
