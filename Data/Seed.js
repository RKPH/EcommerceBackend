const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const axios = require('axios');
const Product = require('../models/products');

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/EcommerceDB';

// Pixabay API configuration
const PIXABAY_API_KEY = '47892725-1c5523b9678c4aa47b6ffcf22';
const PIXABAY_API_URL = 'https://pixabay.com/api/';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Path to the CSV file
// const datasetPath = './cleaned_dataset.csv';

// Function to fetch images from Pixabay API
const fetchPixabayImages = async (query, numImages) => {
    try {
        const response = await axios.get(PIXABAY_API_URL, {
            params: {
                key: PIXABAY_API_KEY,
                q: query || 'product', // Default query if `type` is undefined
                image_type: 'photo',
                per_page: Math.max(3, numImages) // Ensure at least 3 images
            }
        });

        const hits = response.data.hits || [];
        return hits.slice(0, numImages).map(hit => hit.webformatURL);
    } catch (error) {
        console.error(`Error fetching images for query "${query}":`, error.message);
        return Array.from({ length: numImages }, () => `https://via.placeholder.com/150?text=${encodeURIComponent(query || 'Image')}`);
    }
};

// Function to generate fake product data
const generateProductData = async (row) => {
    const { product_id, category_code, brand } = row;

    // Skip if essential data is missing
    if (!product_id || !category_code || !brand) {
        console.log(`Skipping row due to missing required fields: ${JSON.stringify(row)}`);
        return null;
    }

    const [category, type] = category_code.split('.') || ['Uncategorized', 'General'];

    const numColors = Math.floor(Math.random() * 3) + 1;
    const colors = Array.from({ length: numColors }, () => faker.color.rgb());

    const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL'];
    const selectedSizes = sizeOptions.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);

    const images = await fetchPixabayImages(type, numColors);

    return {
        productID: product_id.trim(),
        name: `${type || 'Product'} ${brand.trim()} ${faker.string.uuid()}`,
        category: category || 'Uncategorized',
        brand: brand.trim(),
        type: type || 'General',
        color: colors,
        size: selectedSizes,
        price: parseFloat(faker.commerce.price()),
        image: images,
        description: faker.commerce.productDescription(),
        productImage: images,
    };
};

// Read and process the CSV file
const readCSVAndInsert = async () => {
    const stream = fs.createReadStream(datasetPath)
        .pipe(csvParser());

    let rowCount = 0; // Initialize row counter

    for await (const row of stream) {
        // Stop processing if we've already processed 30 rows

        // Skip rows with missing essential data
        if (!row.product_id || !row.category_code || !row.brand) {
            console.log(`Skipping row due to missing required fields: ${JSON.stringify(row)}`);
            continue; // Skip this row and move to the next one
        }

        try {
            const productData = await generateProductData(row);

            if (!productData) {
                continue; // Skip if product data is null due to missing required fields
            }

            // Check if a product with the same productID already exists
            const existingProduct = await Product.findOne({ productID: productData.productID });
            if (existingProduct) {
                console.log(`Product with ID ${productData.productID} already exists, skipping.`);
                continue; // Skip this product
            }

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
