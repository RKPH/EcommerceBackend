const Product = require('../models/products');
const UserBehavior = require('../models/UserBehaviors');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const updateImageColumns = require('../Data/Update');
// Controller to get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find()
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
    const { name, price, category, type, shortDescription, image } = req.body;

    console.log("product:",req.body);

    if (!name || !category || !type || typeof price !== 'number' || price <= 0) {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid product data. Please ensure all required fields are provided and valid.',
        });
    }

    try {
        // Generate a unique productID
        let productID;
        let isUnique = false;

        while (!isUnique) {
            productID = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit random number
            const existingProduct = await Product.findOne({ productID });
            if (!existingProduct) {
                isUnique = true;
            }
        }

        const newProduct = new Product({
            productID,
            name,
            category,
            type,
            price,
            description: shortDescription,
            MainImage: image,
        });

        await newProduct.save();

        res.status(201).json({
            status: 'success',
            message: 'Product added successfully',
            data: newProduct,
        });
    } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).json({
            status: "error",
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

exports.getTypesByCategory = async (req, res) => {
    const { category } = req.params; // Get category from request params

    try {
        if (!category) {
            return res.status(400).json({
                status: "error",
                message: "Category is required",
            });
        }

        // Fetch distinct types based on the given category
        const types = await Product.distinct("type", { category });

        res.json({
            status: "success",
            message: "Types retrieved successfully",
            data: types,
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
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
    const { type } = req.params;
    const { page = 1, brand, price_min, price_max, rating } = req.query;
    const pageSize = 20;

    // Step 1: Parse page number safely
    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum <= 0) pageNum = 1; // Default to page 1

    // Step 2: Build the filter criteria
    let filter = { type };
    if (brand) filter.brand = brand;
    if (price_min || price_max) {
        filter.price = {};
        if (price_min) filter.price.$gte = Number(price_min);
        if (price_max) filter.price.$lte = Number(price_max);
    }
    if (rating) filter.rating = Number(rating);

    try {
        // Step 3: Get the total number of products after filtering
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / pageSize);

        // Step 4: Ensure page is valid (reset to 1 if it exceeds available pages)
        if (pageNum > totalPages) pageNum = 1; // 🔥 Reset page if filtering reduces results

        // Step 5: Apply filtering & pagination in query
        const products = await Product.find(filter)
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: pageNum, // Updated page number if needed
                pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.getProductsByCategories = async (req, res) => {
    const { category } = req.params;
    const { type, page = 1, brand, price_min, price_max, rating } = req.query;

    const pageSize = 20;

    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

    let filter = { category };

    //Handle multiple types
    if (type) {
        const typeArray = Array.isArray(type) ? type : type.split(',');
        filter.type = { $in: typeArray };
    }

    if (brand) filter.brand = brand;

    if (price_min || price_max) {
        filter.price = {};
        if (price_min) filter.price.$gte = Number(price_min);
        if (price_max) filter.price.$lte = Number(price_max);
    }

    if (rating) filter.rating = Number(rating);

    try {
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / pageSize);

        if (pageNum > totalPages) pageNum = 1;

        const products = await Product.find(filter)
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: pageNum,
                pageSize,
            },
        });
    } catch (error) {
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
        const response = await axios.post("http://103.155.161.94:5000/predict",
            { product_id },
            { headers: { 'Content-Type': 'application/json' } });

        // Log the full response from Flask API
        // console.log("Response from Flask:", response.data);

        if (response.data && response.data.recommendations) {
            const recommendations = response.data.recommendations;

            // Log the recommendations for debugging
            // console.log("Recommendations received:", recommendations);

            // Fetch the recommended products by productID
            const recommendedProducts = await Product.find({
                productID: { $in: recommendations.map(r => r.product_id) }
            });

            // Log the products fetched from the database
            // console.log("Fetched recommended products from DB:", recommendedProducts);

            if (recommendedProducts.length === 0) {
                console.warn("No matching products found in the database for the recommendations.");
            }

            // Map recommendations to product details
            const detailedRecommendations = recommendations.map(rec => {
                const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());
                // console.log("Matching product for recommendation:", product);

                // Ensure the product is found before adding its details
                return {
                    ...rec,
                    productDetails: product ? {
                        name: product.name,
                        category: product.category,
                        rating: product.rating,
                        price: product.price,
                        brand: product.brand,
                        MainImage: product.MainImage,
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
    const { user_id, product_id} = req.body;
    console.log("Received User ID from sessionbase:", user_id, "Product ID:", product_id);

    try {
        // Fetch recommendations from the Flask API
        const response = await axios.post(
            "http://dockersetup-flask-app-1:5000/session-recommend",
            { user_id, product_id},
            { headers: { 'Content-Type': 'application/json' } }
        );

        // console.log("Raw Response from Flask:", response?.data);

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
        // console.log("Extracted Recommendations:", Recommendations);

        // Fetch the recommended products by productID
        const recommendedProducts = await Product.find({
            productID: { $in: Recommendations.map(r => r.product_id) }
        });

        // console.log("Fetched recommended products from DB:", recommendedProducts);

        const detailedRecommendations = Recommendations.map(rec => {
            const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());
            // console.log("Matching product for recommendation:", product);

            return {
                ...rec,
                productDetails: product ? {
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    rating: product.rating,
                    brand: product.brand,
                    MainImage: product.MainImage,
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

// Controller for anonymous recommendations (guest users)
exports.anonymousRecommendation = async (req, res) => {
    const { product_id } = req.body;
    console.log("Received Product ID from anonymous recommendation:", product_id);

    try {
        // Fetch recommendations from the Flask API
        const response = await axios.post(
            "http://dockersetup-flask-app-1:5000/anonymous-recommend",
            { product_id },
            { headers: { 'Content-Type': 'application/json' } }
        );

        // Handle invalid JSON containing NaN (just in case)
        let data;
        if (typeof response?.data === "string") {
            try {
                data = JSON.parse(response.data);
            } catch (error) {
                console.error("JSON parse failed, attempting to sanitize response:", error.message);

                // Sanitize NaN if needed (this might be unnecessary if Flask already handles it)
                const sanitized = response.data.replace(/NaN/g, "0");
                data = JSON.parse(sanitized);
            }
        } else {
            data = response.data;
        }

        const Recommendations = data?.recommendations || [];
        console.log("Extracted Recommendations for anonymous:", Recommendations);

        // Fetch the recommended products by productID from the database
        const recommendedProducts = await Product.find({
            productID: { $in: Recommendations.map(r => r.product_id) }
        });

        const detailedRecommendations = Recommendations.map(rec => {
            const product = recommendedProducts.find(p => p.productID === rec.product_id.toString());

            return {
                ...rec,
                productDetails: product ? {
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    rating: product.rating,
                    brand: product.brand,
                    MainImage: product.MainImage,
                    description: product.description,
                } : null,
            };
        });

        res.json({
            status: 'success',
            message: 'Anonymous recommendations retrieved successfully',
            data: detailedRecommendations,
        });

    } catch (error) {
        console.error("Error in anonymousRecommendation:", error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to get 10 products with the highest trending_score
exports.getTopTrendingProducts = async (req, res) => {
    try {
        // Step 1: Aggregate behavior counts per product
        const trendingProducts = await UserBehavior.aggregate([
            {
                $group: {
                    _id: '$product_id',   // Group by product_id
                    totalInteractions: { $sum: 1 }  // Count occurrences
                }
            },
            { $sort: { totalInteractions: -1 } },
            { $limit: 10 }
        ]);

        console.log("Trending Products (Aggregation Result):", trendingProducts);

        if (trendingProducts.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No trending products found', data: [] });
        }

        const productIDs = trendingProducts.map(p => p._id);
        console.log("Product IDs:", productIDs);

        // Step 2: Fetch product details
        const products = await Product.find({ productID: { $in: productIDs } });

        console.log("Fetched Products:", products);

        const productsWithTrend = products.map(product => {
            const trendData = trendingProducts.find(t => t._id === product.productID);
            return {
                ...product.toObject(),
                totalInteractions: trendData ? trendData.totalInteractions : 0
            };
        });

        res.json({ status: 'success', message: 'Top trending products retrieved successfully', data: productsWithTrend });
    } catch (error) {
        console.error("Error fetching trending products:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};


exports.updateProductImage = async (req, res) => {
    const { type, brand } = req.body;

    if (!type || !brand) {
        return res.status(400).json({ error: "Type and brand are required." });
    }

    try {
        // Call the external function
        const result = await updateImageColumns(type, brand);
        return res.json(result);
    } catch (error) {
        console.error("Error updating images:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
}

// Controller to search products
exports.searchProducts = async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).json({
            status: 'error',
            message: 'Search query is required.',
        });
    }

    try {
        const products = await Product.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).limit(10);

        res.json({
            status: 'success',
            message: 'Search results retrieved successfully',
            data: products,
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

exports.searchProductsPaginated = async (req, res) => {
    try {
        const { query, page = 1, limit = 20, brand, price_min, price_max, rating } = req.query;

        const pageSize = parseInt(limit, 10) || 20;
        let pageNum = parseInt(page, 10) || 1;
        if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

        // Search filter (matches multiple fields)
        const searchFilter = {
            $or: [
                { name: { $regex: query || '', $options: 'i' } },
                { category: { $regex: query || '', $options: 'i' } },
                { brand: { $regex: query || '', $options: 'i' } },
                { description: { $regex: query || '', $options: 'i' } }
            ]
        };

        // Filter conditions (brand, price range, rating)
        const filterConditions = {};
        if (brand) {
            filterConditions.brand = { $regex: brand, $options: 'i' };
        }
        if (price_min || price_max) {
            filterConditions.price = {};
            if (price_min) filterConditions.price.$gte = parseFloat(price_min);
            if (price_max) filterConditions.price.$lte = parseFloat(price_max);
        }
        if (rating) {
            filterConditions.rating = Number(rating);
        }

        // Combine filters
        const combinedFilters = [searchFilter];
        if (Object.keys(filterConditions).length > 0) {
            combinedFilters.push(filterConditions);
        }

        const finalFilter = combinedFilters.length > 1 ? { $and: combinedFilters } : searchFilter;

        // Count total products (for pagination)
        const totalProducts = await Product.countDocuments(finalFilter);
        const totalPages = Math.ceil(totalProducts / pageSize);

        // Ensure page number is valid
        if (pageNum > totalPages) pageNum = totalPages;

        // Fetch paginated products
        const products = await Product.find(finalFilter)
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        // Send response
        res.json({
            status: 'success',
            data: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: pageNum,
                pageSize,
            },
        });

    } catch (error) {
        console.error('Error in searchProducts:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    console.log("Deleting product with ID:", id);

    // Convert ID to an integer if necessary
    const productId = parseInt(id, 10);

    try {
        // Find and delete the product
        const deletedProduct = await Product.findOneAndDelete({ productID: productId });

        if (!deletedProduct) {
            return res.status(404).json({
                status: 'error',
                message: `Product with productID ${productId} not found.`,
            });
        }

        res.json({
            status: 'success',
            message: `Product with productID ${productId} deleted successfully.`,
            data: deletedProduct,
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};
