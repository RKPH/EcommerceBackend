const mongoose = require('mongoose');
const csvParser = require('csv-parser');
const fs = require('fs');
const { faker } = require('@faker-js/faker');
const Product = require('../models/products');

// MongoDB connection URI
const mongoURI = 'mongodb://mongodb-service:27017/ecommerce';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit process on connection failure
    });

// Path to the CSV file
const datasetPath = './cleaned_dataset.csv';

// Helper function to capitalize the first letter of each word
const capitalizeWords = (str) => {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Function to generate unique and ordered arrays
const generateUniqueAndOrderedArray = (options, count) => {
    const selected = new Set();
    while (selected.size < count) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        selected.add(randomOption);
    }
    return Array.from(selected).sort((a, b) => {
        // Ensure "4GB", "8GB", etc. are sorted numerically and lexicographically
        const parseValue = (val) => parseInt(val.replace(/\D/g, ''), 10);
        return parseValue(a) - parseValue(b);
    });
};

// Function to generate fake product data
const generateProductData = async (row) => {
    const { product_id, category_code, brand } = row;

    if (!product_id || !category_code || !brand) {
        return null; // Skip row if essential fields are missing
    }

    // Parse category_code and handle cases with 2 or 3 segments
    const parts = category_code.split('.');
    const category = parts[0] || 'Uncategorized';
    const type = parts.length === 3 ? parts[2] : parts[1] || 'General';

    const numColors = Math.floor(Math.random() * 3) + 1;
    const colors = Array.from({ length: numColors }, () => faker.color.rgb());

    const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL'];
    const selectedSizes = sizeOptions.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 1);

    const ramOptions = ['4GB', '8GB', '16GB', '32GB'];
    const storageOptions = ['64GB', '128GB', '256GB', '512GB'];

    // Generate unique and ordered RAM and storage options
    const ram = generateUniqueAndOrderedArray(ramOptions, Math.floor(Math.random() * 2) + 1);
    const storage = generateUniqueAndOrderedArray(storageOptions, Math.floor(Math.random() * 2) + 1);

    const rating = (Math.random() * 4 + 1).toFixed(1);

    // Placeholder images
    const placeholderImage = "https://via.placeholder.com/150?text=Product+Image";
    const images = Array(3).fill(placeholderImage); // 3 placeholder images for the 'image' field
    const uniqueImages = Array(3).fill(placeholderImage); // 3 placeholder images for the 'productImage' field

    // Capitalize the product name
    const name = capitalizeWords(`${type} ${brand.trim()} ${product_id.trim()}`);

    return {
        productID: product_id.trim(),
        name: name,
        category: category,
        brand: brand.trim(),
        type: type,
        color: colors,
        size: selectedSizes,
        ram: ram,
        storage: storage,
        rating: rating,
        price: parseFloat(faker.commerce.price()),
        image: images,
        description: faker.commerce.productDescription(),
        productImage: uniqueImages,
    };
};

// Read and process the CSV file
const readCSVAndInsert = async () => {
    const stream = fs.createReadStream(datasetPath)
        .pipe(csvParser());

    let rowCount = 0;

    try {
        for await (const row of stream) {
            if (!row.product_id || !row.category_code || !row.brand) {
                console.log(`Skipping row due to missing fields: ${JSON.stringify(row)}`);
                continue;
            }

            try {
                const productData = await generateProductData(row);

                if (!productData) {
                    continue; // Skip if product data generation fails
                }

                // Check if the product already exists
                const existingProduct = await Product.findOne({ productID: productData.productID });
                if (existingProduct) {
                    console.log(`Product with ID ${productData.productID} already exists. Skipping.`);
                    continue;
                }

                const product = new Product(productData);
                await product.save();
                console.log(`Inserted product with ID: ${product.productID}`);
                rowCount++;
            } catch (innerError) {
                console.error('Error processing row:', innerError);
            }
        }
    } catch (outerError) {
        console.error('Error reading CSV file:', outerError);
    } finally {
        console.log(`CSV processing completed. Total rows inserted: ${rowCount}`);
        mongoose.connection.close();
    }
};

// Start the process
readCSVAndInsert();
