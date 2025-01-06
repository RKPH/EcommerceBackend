const Product = require('../models/products');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
// Controller to get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: products,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to get a product by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    console.log (id);
    try {
        const product = await Product.findOne({ productID: id });

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Product with productID ${id} not found`,
                data: null,
            });
        }

        res.json({
            status: 'success',
            message: `Product with productID ${id} retrieved successfully`,
            data: product,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to create a new product
exports.addProduct = async (req, res) => {
    const {
        name,
        price,
        category,
        type,
        brand,
        color,
        size,
        description,
        image,
        productImage,
    } = req.body;

    // Validate the product data
    if (
        !name ||
        !category ||
        !type ||
        !Array.isArray(image) ||
        !productImage ||
        !Array.isArray(productImage) ||
        productImage.length === 0 ||
        typeof price !== 'number' ||
        price <= 0
    ) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid product data. Please ensure all required fields are provided and valid.',
        });
    }

    try {
        const newProduct = new Product({
            name,
            category,
            type,
            brand,
            color: color || [],
            size: size || [],
            price,
            description,
            image: image || [],
            productImage,
        });

        await newProduct.save();

        res.status(201).json({
            status: 'success',
            message: 'Product added successfully',
            data: newProduct,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to get all distinct types
exports.getAllTypes = async (req, res) => {
    try {
        const types = await Product.distinct('type');
        res.json({
            status: 'success',
            message: 'Types retrieved successfully',
            data: types,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.getProductByTypes = async (req, res) => {
    const { type } = req.params; // Extract the product type from the route parameters
    const { limit } = req.query; // Extract the limit from query parameters (if provided)

    try {
        // Use Mongoose to query products by type
        let query = Product.find({ type });

        // Apply the limit if it's provided and a valid number
        if (limit && !isNaN(limit)) {
            query = query.limit(Number(limit));
        }

        const products = await query;

        // Check if any products were found
        if (!products || products.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: `No products found for type: ${type}`,
            });
        }

        // Send the retrieved products in the response
        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: products,
        });
    } catch (error) {
        // Handle any errors that occur during the query
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.getRecommendations = async (req, res) => {
    const { product_id } = req.params;  // Get product_id from URL parameter
    console.log("Received Product ID:", product_id);  // Log the received product ID

    try {
        // Fetch recommendations from the recommendation API
        const response = await axios.post("http://127.0.0.1:5000/predict",
            { product_id },
            { headers: { 'Content-Type': 'application/json' } });

        // Log the full response from Flask API
        console.log("Response from Flask:", response.data);

        if (response.data && response.data.recommendations) {
            const recommendations = response.data.recommendations;

            // Log the recommendations for debugging
            console.log("Recommendations received:", recommendations);

            // Fetch the recommended products by productID
            const recommendedProducts = await Product.find({
                productID: { $in: recommendations.map(r => r.product_id) }
            });

            // Log the products fetched from the database
            console.log("Fetched recommended products from DB:", recommendedProducts);

            if (recommendedProducts.length === 0) {
                console.warn("No matching products found in the database for the recommendations.");
            }

            // Map recommendations to product details
            const detailedRecommendations = recommendations.map(rec => {
                const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());
                console.log("Matching product for recommendation:", product);

                // Ensure the product is found before adding its details
                return {
                    ...rec,
                    productDetails: product ? {
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        image: product.image,
                        description: product.description,
                    } : null  // Add the product details if found
                };
            });

            res.json({
                status: 'success',
                message: 'Recommendations retrieved successfully',
                data: detailedRecommendations,
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'No recommendations found',
            });
        }
    } catch (error) {
        // Log the error from Express.js
        console.error("Error in getRecommendations:", error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};



// Controller for session-based recommendations
exports.sessionBasedRecommendation = async (req, res) => {
    const { user_id , product_id } = req.body;  // Get user_id from request body
    console.log("Received User ID:", user_id);  // Log the received user_id

    try {
        // Hash the user_id to convert it into a unique numeric value


        // Fetch recommendations from the recommendation API
        const response = await axios.post("http://127.0.0.1:5000/session-recommend",
            { user_id: user_id , product_id: product_id },
            { headers: { 'Content-Type': 'application/json' } });

        // Log the full response from the Flask API
        console.log("Response from Flask:", response.data);

        if (response.data && response.data.recommendations) {
            const recommendations = response.data.recommendations;

            // Fetch the recommended products by productID
            const recommendedProducts = await Product.find({
                productID: { $in: recommendations.map(r => r.product_id) }
            });

            // Log the products fetched from the database
            console.log("Fetched recommended products from DB:", recommendedProducts);

            if (recommendedProducts.length === 0) {
                console.warn("No matching products found in the database for the recommendations.");
            }

            // Map recommendations to product details
            const detailedRecommendations = recommendations.map(rec => {
                const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());
                console.log("Matching product for recommendation:", product);

                // Ensure the product is found before adding its details
                return {
                    ...rec,
                    productDetails: product ? {
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        image: product.image,
                        description: product.description,
                    } : null  // Add the product details if found
                };
            });

            res.json({
                status: 'success',
                message: 'Recommendations retrieved successfully',
                data: detailedRecommendations,
            });
        } else {
            res.status(404).json({
                status: 'error',
                message: 'No recommendations found',
            });
        }
    } catch (error) {
        // Log the error from Express.js
        console.error("Error in sessionBasedRecommendation:", error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};