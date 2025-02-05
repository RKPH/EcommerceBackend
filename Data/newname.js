const mongoose = require('mongoose');
const Product = require('../models/products'); // Adjust the path to your Product model if needed

// MongoDB connection URI
const mongoURI = 'mongodb://mongodb-service:27017/ecommerce';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Function to update product names
const updateProductNames = async () => {
    try {
        const products = await Product.find(); // Fetch all products from the database

        for (const product of products) {
            const { type, brand, productID } = product;

            // Update the name format
            const updatedName = `${type || 'Product'} ${brand.trim()} ${productID}`;
            product.name = updatedName;

            // Save the updated product
            await product.save();
            console.log(`Updated product name for ID: ${productID}`);
        }

        console.log('All product names updated successfully.');
    } catch (error) {
        console.error('Error updating product names:', error);
    } finally {
        // Close the database connection
        mongoose.connection.close();
    }
};

// Start the update process
updateProductNames();
