// seed.js
const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const Product = require('../models/products');

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/EcommerceDB';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Path to the CSV file
const datasetPath = './2019-Nov.csv';

// Function to generate fake product data
const generateProductData = (row) => {
    // Split the category_code into category and type
    const [category, type] = row.category_code ? row.category_code.split('.') : [null, null];

    // Generate a random number of colors (1 to 3)
    const numColors = Math.floor(Math.random() * 3) + 1;
    const colors = Array.from({ length: numColors }, () => faker.color.rgb()); // Generates hex colors

    return {
        productID: row.product_id,
        name: faker.commerce.productName(),
        category: category || 'Uncategorized', // Default to 'Uncategorized' if category is null
        brand: row.brand,
        type: type || 'General', // Default to 'General' if type is null
        color: colors, // Colors in hex format
        size: Array.from({ length: 2 }, () => faker.helpers.arrayElement(['S', 'M', 'L', 'XL', 'XXL'])),
        price: parseFloat(faker.commerce.price()),
        image: Array.from({ length: numColors }, () =>
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Image_not_available.png/640px-Image_not_available.png'
        ), // Match number of images to colors
        description: faker.commerce.productDescription(),
        productImage: Array.from({ length: numColors }, () =>
            'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Image_not_available.png/640px-Image_not_available.png'
        ), // Match number of productImages to colors
    };
};


// Read and process the CSV file
const readCSVAndInsert = async () => {
    const stream = fs.createReadStream(datasetPath)
        .pipe(csvParser());

    let rowCount = 0; // Initialize row counter

    for await (const row of stream) {
        if (rowCount >= 10) {
            break; // Stop processing after 10 rows
        }

        try {
            const productData =generateProductData(row);
            const product = new Product(productData);
            await product.save();
            console.log(`Inserted product with ID: ${product.productID}`);
            rowCount++; // Increment row counter
        } catch (error) {
            console.error('Error inserting row:', error);
        }
    }

    console.log('CSV processing completed.');
    mongoose.connection.close();
};

// Start the process
readCSVAndInsert();
