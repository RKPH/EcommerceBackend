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
exports.getProductById = async (req, res) => {
    let { id } = req.params;
    console.log("productID param:", id); // Log the incoming id

    // Convert the id to an integer (Int32)
    const productId = parseInt(id.trim(), 10); // Ensure the input is an integer
    console.log("productID as integer:", productId);

    try {
        const product = await Product.findOne({ productID: productId });
        console.log("Fetched product:", product);

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Product with productID ${productId} not found`,
                data: null,
            });
        }

        res.json({
            status: 'success',
            message: `Product with productID ${productId} retrieved successfully`,
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

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        res.json({
            status: 'success',
            message: 'Categories retrieved successfully',
            data: categories,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
}

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
        const response = await axios.post("http://flask-app:5000/predict",
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
    const { user_id, product_id } = req.body;
    console.log("Received User ID:", user_id, "Product ID:", product_id);

    try {
        // Fetch recommendations from the Flask API
        const response = await axios.post(
            "http://flask-app:5000/session-recommend",
            { user_id, product_id },
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log("Raw Response from Flask:", response?.data);

        // Handle invalid JSON containing NaN
        let data;
        if (typeof response?.data === "string") {
            try {
                data = JSON.parse(response.data);
            } catch (error) {
                console.error("JSON parse failed, attempting to sanitize response:", error.message);

                // Sanitize the invalid JSON manually
                const sanitized = response.data.replace(/NaN/g, "0");
                data = JSON.parse(sanitized); // Retry parsing with sanitized data
            }
        } else {
            data = response.data;
        }

        const Recommendations = data?.recommendations || [];
        console.log("Extracted Recommendations:", Recommendations);

        // Fetch the recommended products by productID
        const recommendedProducts = await Product.find({
            productID: { $in: Recommendations.map(r => r.product_id) }
        });

        console.log("Fetched recommended products from DB:", recommendedProducts);

        const detailedRecommendations = Recommendations.map(rec => {
            const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());
            console.log("Matching product for recommendation:", product);

            return {
                ...rec,
                productDetails: product ? {
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    image: product.image,
                    description: product.description,
                } : null,
            };
        });

        res.json({
            status: 'success',
            message: 'Recommendations retrieved successfully',
            data: detailedRecommendations,
        });
    } catch (error) {
        console.error("Error in sessionBasedRecommendation:", error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};


// Controller to get 10 products with the highest trending_score
exports.getTopTrendingProducts = async (req, res) => {
    try {
        // Fetch the top 10 products sorted by trending_score in descending order
        const products = await Product.find()
            .sort({ trending_score: -1 }) // Sort by trending_score in descending order
            .limit(10); // Limit the results to 10

        if (products.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No trending products found',
                data: [],
            });
        }

        res.json({
            status: 'success',
            message: 'Top trending products retrieved successfully',
            data: products,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};
