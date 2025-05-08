const Product = require('../models/products');
const UserBehavior = require('../models/UserBehaviors');
const Order = require('../models/Order');
const Review = require('../models/reviewSchema');
const axios = require('axios');
const fs = require('fs');
const fsp = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { parse } = require('csv-parse');
require('dotenv').config();
// Service functions

// Configuration for Jina AI
const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_ENDPOINT = 'https://api.jina.ai/v1/embeddings';
const MODEL = 'jina-embeddings-v3';
const TARGET_DIMENSION = 128;

const getEmbeddingFromJinaAI = async (text) => {
    try {
        // Validate the API key
        if (!JINA_API_KEY) {
            throw new Error('Jina AI API key is not set. Please set the JINA_API_KEY environment variable in your .env file.');
        }

        // Validate input text
        if (!text || typeof text !== 'string' || text.trim() === '') {
            throw new Error('Input text must be a non-empty string.');
        }

        // Prepare the request payload
        const payload = {
            input: [text],
            model: MODEL,
            normalized: true, // Jina AI will normalize the embedding
            embedding_type: 'float'
        };

        console.log(`Fetching embedding from Jina AI for text: "${text}"...`);
        // Make the request to Jina AI
        const response = await axios.post(JINA_ENDPOINT, payload, {
            headers: {
                'Authorization': `Bearer ${JINA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Check for API errors
        if (response.status !== 200 || !response.data.data || !response.data.data[0]) {
            throw new Error('Invalid response from Jina AI: ' + JSON.stringify(response.data));
        }

        // Extract and truncate the embedding to 128 dimensions
        const embedding = response.data.data[0].embedding.slice(0, TARGET_DIMENSION);
        if (!embedding || embedding.length !== TARGET_DIMENSION) {
            throw new Error(`Embedding dimension mismatch: expected ${TARGET_DIMENSION}, got ${embedding.length}`);
        }

        // Normalize the embedding (Jina AI already normalizes, but we verify)
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        const normalizedEmbedding = norm > 0 ? embedding.map(val => val / norm) : embedding;

        console.log(`Embedding generated successfully, length: ${normalizedEmbedding.length}`);
        return normalizedEmbedding; // Returns a 128-dimensional vector
    } catch (error) {
        console.error('Failed to get embedding from Jina AI:', error.message);
        // Fallback to a zero vector if the request fails
        return Array(TARGET_DIMENSION).fill(0);
    }
};

const generateUserSession = () => {
    return uuidv4(); // Generates a UUID v4, e.g., "550e8400-e29b-41d4-a716-446655440000"
};
exports.createProduct = async ({
                                   name, price, category, type, brand, stock, mainImage, description
                               }) => {
    try {
        console.log("Starting createProduct...");
        if (!name || !price || !category || !type || !brand || !stock || !mainImage) {
            throw new Error('Missing required fields');
        }
        console.log("Creating product...");

        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock, 10);
        if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error('Invalid price');
        if (isNaN(parsedStock) || parsedStock < 0) throw new Error('Invalid stock');

        let product_id;
        let isUnique = false;
        do {
            product_id = Math.floor(1000000 + Math.random() * 9000000).toString();
            const existingProduct = await Product.findOne({ product_id });
            if (!existingProduct) isUnique = true;
        } while (!isUnique);

        const newProductData = {
            product_id,
            name,
            price: parsedPrice,
            category,
            type,
            brand,
            stock: parsedStock,
            MainImage: mainImage,
            description: description || '',
        };

        const newProduct = new Product(newProductData);
        const savedProduct = await newProduct.save();
        console.log("Product saved to DB:", savedProduct.product_id);

        const textToEmbed = savedProduct.name.trim();
        console.log("Fetching embedding for:", textToEmbed);
        const vector = await getEmbeddingFromJinaAI(textToEmbed);
        console.log("Embedding received, length:", vector.length);
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        const eventTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
        const user_session = generateUserSession();
        const category_code = `${savedProduct.category.trim().replace(/\s+/g, '_')}.${savedProduct.type.trim().replace(/\s+/g, '_')}`.toLowerCase();

        const qdrantPayload = {
            event_type: "view",
            price: savedProduct.price,
            name: savedProduct.name,
            category_code: category_code,
            user_id: "574370358",
            product_id: savedProduct.product_id,
            event_time: eventTime,
            user_session: user_session,
            brand: savedProduct.brand
        };

        const qdrantPointId = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"

        const point = {
            id: qdrantPointId, // Use UUID instead of omitting id
            vector,
            payload: qdrantPayload
        };

        const qdrantUrl = process.env.QDRANT_API_URL;
        const upsertParams = { points: [point] };

        console.log("Upserting to Qdrant with payload:", JSON.stringify(upsertParams, null, 2));
        console.log("Sending request to Qdrant...");
        try {
            const response = await axios.put(qdrantUrl, upsertParams, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.SWMCjlnWh7pD_BlK885iwtg30KtPXcngjNkTd8BuFAU',
                },
            });
            console.log("RE", response.data);

        } catch (qdrantError) {
            console.error("Qdrant upsert failed:", qdrantError.message, qdrantError.response?.data);
            throw new Error("Qdrant upsert error: " + qdrantError.message);
        }

        console.log("Product creation completed.");
        return {
            product_id: savedProduct.product_id,
            name: savedProduct.name,
            price: savedProduct.price,
            category: savedProduct.category,
            type: savedProduct.type,

            brand: savedProduct.brand,
            stock: savedProduct.stock,
            MainImage: savedProduct.MainImage,
            description: savedProduct.description,
            _id: savedProduct._id,
            createdAt: savedProduct.createdAt,
        };
    } catch (error) {
            console.error("Error in createProduct:", error.message, error.stack);
            throw error;
        }
};

//create multiple products
exports.createProducts = async (filePath) => {
    try {
        console.log('Reading file at path:', filePath);
        const productsData = await new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(filePath)
                .pipe(parse({
                    delimiter: ',',
                    columns: headers => headers.map(header => header.trim().replace(/^['"]|['"]$/g, '')), // Normalize headers
                    skip_empty_lines: true,
                    trim: true
                }))
                .on('headers', (headers) => console.log('CSV headers:', headers))
                .on('data', (row) => {
                    console.log('Parsed CSV row (raw):', row);
                    console.log('Parsed CSV row keys:', Object.keys(row));
                    results.push(row);
                })
                .on('end', () => {
                    console.log('Finished parsing CSV. Total rows:', results.length);
                    resolve(results);
                })
                .on('error', (error) => {
                    console.error('CSV parsing error:', error);
                    reject(error);
                });
        });

        console.log('Products data after parsing:', productsData);

        if (!Array.isArray(productsData) || productsData.length === 0) {
            throw new Error('File is empty or invalid.');
        }

        const createdProducts = [];
        for (const product of productsData) {
            console.log('Raw product object before destructuring:', product);
            console.log('Product object keys:', Object.keys(product));
            const {
                name,
                price,
                category,
                type,
                brand,
                stock,
                mainImage,
                description
            } = product;
            console.log('Destructured values:', { name, price, category, type, brand, stock, mainImage, description });

            if (!name || !price || !category || !type || !brand || !stock || !mainImage) {
                throw new Error(`Missing required fields for product: ${name || 'Unnamed product'}`);
            }

            // Validate numeric fields
            const parsedPrice = parseFloat(price);
            const parsedStock = parseInt(stock, 10);
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
                throw new Error(`Invalid price for product: ${name}. Price must be a positive number.`);
            }
            if (isNaN(parsedStock) || parsedStock < 0) {
                throw new Error(`Invalid stock for product: ${name}. Stock must be a non-negative integer.`);
            }

            // Generate a unique product_id
            let product_id;
            let isUnique = false;
            do {
                product_id = Math.floor(1000000 + Math.random() * 9000000).toString(); // 7-digit number
                const existingProduct = await Product.findOne({ product_id });
                if (!existingProduct) {
                    isUnique = true;
                }
            } while (!isUnique);

            // Prepare the new product data
            const newProductData = {
                product_id,
                name,
                price: parsedPrice,
                category,
                type,
                brand,
                stock: parsedStock,
                MainImage: mainImage,
                description: description || '',
            };

            // Create and save the new product
            const newProduct = new Product(newProductData);
            const savedProduct = await newProduct.save();

            if (!savedProduct) {
                throw new Error(`Failed to create product: ${name}`);
            }

            createdProducts.push({
                product_id: savedProduct.product_id,
                name: savedProduct.name,
                price: savedProduct.price,
                category: savedProduct.category,
                type: savedProduct.type,
                brand: savedProduct.brand,
                stock: savedProduct.stock,
                MainImage: savedProduct.MainImage,
                description: savedProduct.description,
                _id: savedProduct._id,
                createdAt: savedProduct.createdAt,
            });
        }

        return createdProducts;
    } catch (error) {
        if (error.message.includes('CSV')) {
            throw new Error('Error parsing CSV file: ' + error.message);
        }
        if (error.name === 'ValidationError') {
            throw new Error('Validation error: ' + Object.values(error.errors).map(err => err.message).join(', '));
        }
        if (error.code === 11000 && error.keyPattern?.product_id) {
            throw new Error('Duplicate product ID detected.');
        }
        throw new Error(`Failed to create products: ${error.message}`);
    }
};
// Update
exports.updateProduct = async (product_id, updateData) => {
    try {
        if (!product_id || isNaN(parseInt(product_id))) {
            throw new Error('Invalid product ID.');
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { product_id: parseInt(product_id) },
            updateData,
            { new: true }
        );

        if (!updatedProduct) {
            throw new Error(`Product with product_id ${product_id} not found`);
        }

        return updatedProduct;
    } catch (error) {
        throw error;
    }
};

// delete
exports.deleteProduct = async (product_id) => {
    try {
        const parsedProductId = parseInt(product_id, 10);
        if (isNaN(parsedProductId)) {
            throw new Error('Invalid product_id format. Must be an integer.');
        }

        // Check if the product exists
        const product = await Product.findOne({ product_id: parsedProductId });
        if (!product) {
            throw new Error(`Product with product_id ${parsedProductId} not found.`);
        }

        // Check if product is referenced in active orders
        const activeOrders = await Order.find({
            'products.product': product._id,
            status: { $in: ['Pending', 'Confirmed'] },
        });
        if (activeOrders.length > 0) {
            throw new Error('Cannot delete product. It is referenced in active orders.');
        }

        // Delete the product
        const deletedProduct = await Product.findOneAndDelete({ product_id: parsedProductId });
        if (!deletedProduct) {
            throw new Error('Failed to delete product.');
        }

        // Delete related reviews
        await Review.deleteMany({ product_id: parsedProductId });

        return {
            product_id: deletedProduct.product_id,
            name: deletedProduct.name,
            _id: deletedProduct._id,
        };
    } catch (error) {
        throw error;
    }
};





exports.getAllProducts = async ({ page = 1, limit = 10, category, type, search }) => {
    let query = Product.find();
    if (category) query = query.where("category").equals(category);
    if (type) query = query.where("type").equals(type);
    if (search) query = query.where("name").regex(new RegExp(search, "i"));

    const totalItems = await Product.countDocuments(query.getFilter());
    const totalPages = Math.ceil(totalItems / limit);
    const products = await query
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec();

    return { products, totalItems, totalPages, currentPage: page, itemsPerPage: limit };
};

exports.getProductById = async (id) => {
    const productId = parseInt(id.trim(), 10);
    const product = await Product.findOne({ product_id: productId });
    return { product, productId };
};


exports.getAllTypes = async () => {
    return await Product.distinct('type');
};

exports.getTypesByCategory = async (category) => {
    console.log("receive: ", category);

    if (!category) throw new Error("Category is required");
    return await Product.distinct("type", { category });
};

exports.getAllCategories = async () => {
    return await Product.distinct('category');
};

exports.getProductByTypes = async ({ type, page = 1, brand, price_min, price_max, rating }) => {
    const pageSize = 20;
    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

    let filter = { type };
    if (brand) filter.brand = brand;
    if (price_min || price_max) {
        filter.price = {};
        if (price_min) filter.price.$gte = Number(price_min);
        if (price_max) filter.price.$lte = Number(price_max);
    }
    if (rating) filter.rating = Number(rating);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);
    if (pageNum > totalPages) pageNum = 1;

    const products = await Product.find(filter)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize);

    return { products, totalProducts, totalPages, currentPage: pageNum, pageSize };
};

exports.getProductsByCategories = async ({ category, type, page = 1, brand, price_min, price_max, rating }) => {
    const pageSize = 20;
    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

    let filter = { category };
    if (type) filter.type = { $in: Array.isArray(type) ? type : type.split(',') };
    if (brand) filter.brand = brand;
    if (price_min || price_max) {
        filter.price = {};
        if (price_min) filter.price.$gte = Number(price_min);
        if (price_max) filter.price.$lte = Number(price_max);
    }
    if (rating) filter.rating = Number(rating);

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / pageSize);
    if (pageNum > totalPages) pageNum = 1;

    const products = await Product.find(filter)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize);

    return { products, totalProducts, totalPages, currentPage: pageNum, pageSize };
};

exports.getRecommendations = async (product_id) => {
    product_id = product_id.toString();
    // Fetch the input product's type and category
    const inputProduct = await Product.findOne({ product_id });
    const inputProductType = inputProduct ? inputProduct.type : null;
    const inputProductCategory = inputProduct ? inputProduct.category : null;

    const response = await axios.post(
        `${process.env.AI_API_BASE_URL}/predict`,
        { product_id },
        { headers: { 'Content-Type': 'application/json' } }
    );
    if (!response.data?.recommendations) throw new Error("No recommendations found");

    const recommendations = response.data.recommendations;
    const recommendedProducts = await Product.find({
        product_id: { $in: recommendations.map(r => r.product_id.toString()) },
    });

    const mappedRecommendations = recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id === rec.product_id);
        return {
            ...rec,
            productDetails: product
                ? {
                    name: product.name,
                    category: product.category,
                    rating: product.rating,
                    price: product.price,
                    brand: product.brand,
                    MainImage: product.MainImage,
                    description: product.description,
                    type: product.type
                }
                : null,
        };
    });

    // Sort: products with same type or category as input go to the end
    return mappedRecommendations.sort((a, b) => {
        const aType = a.productDetails?.type;
        const bType = b.productDetails?.type;
        const aCategory = a.productDetails?.category;
        const bCategory = b.productDetails?.category;

        if (!inputProductType && !inputProductCategory) return 0; // No sorting if input type/category unknown

        const aMatches = (aType === inputProductType || aCategory === inputProductCategory);
        const bMatches = (bType === inputProductType || bCategory === inputProductCategory);

        if (aMatches && !bMatches) return 1; // a matches, b doesn't -> a to end
        if (bMatches && !aMatches) return -1; // b matches, a doesn't -> b to end
        return 0; // Maintain original order
    });
};

exports.sessionBasedRecommendation = async ({ user_id, product_id }) => {
    user_id = user_id.toString();
    product_id = product_id.toString();
    // Fetch the input product's type and category
    const inputProduct = await Product.findOne({ product_id });
    const inputProductType = inputProduct ? inputProduct.type : null;
    const inputProductCategory = inputProduct ? inputProduct.category : null;

    const response = await axios.post(
        `${process.env.AI_API_BASE_URL}/session-recommend`,
        { user_id, product_id },
        { headers: { 'Content-Type': 'application/json' } }
    );
    let data = typeof response?.data === "string" ? JSON.parse(response.data.replace(/NaN/g, "0")) : response.data;
    const recommendations = data?.recommendations || [];

    const recommendedProducts = await Product.find({
        product_id: { $in: recommendations.map(r => r.product_id.toString()) },
    });

    const mappedRecommendations = recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id === rec.product_id);
        return {
            ...rec,
            productDetails: product
                ? {
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    rating: product.rating,
                    brand: product.brand,
                    MainImage: product.MainImage,
                    description: product.description,
                    type: product.type
                }
                : null,
        };
    });

    // Sort: products with same type or category as input go to the end
    return mappedRecommendations.sort((a, b) => {
        const aType = a.productDetails?.type;
        const bType = b.productDetails?.type;
        const aCategory = a.productDetails?.category;
        const bCategory = b.productDetails?.category;

        if (!inputProductType && !inputProductCategory) return 0; // No sorting if input type/category unknown

        const aMatches = (aType === inputProductType || aCategory === inputProductCategory);
        const bMatches = (bType === inputProductType || bCategory === inputProductCategory);

        if (aMatches && !bMatches) return 1; // a matches, b doesn't -> a to end
        if (bMatches && !aMatches) return -1; // b matches, a doesn't -> b to end
        return 0; // Maintain original order
    });
};

exports.anonymousRecommendation = async (product_id) => {
    product_id = product_id.toString();
    // Fetch the input product's type and category
    const inputProduct = await Product.findOne({ product_id });
    const inputProductType = inputProduct ? inputProduct.type : null;
    const inputProductCategory = inputProduct ? inputProduct.category : null;

    const response = await axios.post(
        `${process.env.AI_API_BASE_URL}/anonymous-recommend`,
        { product_id },
        { headers: { 'Content-Type': 'application/json' } }
    );
    let data = typeof response?.data === "string" ? JSON.parse(response.data.replace(/NaN/g, "0")) : response.data;
    const recommendations = data?.recommendations || [];

    const recommendedProducts = await Product.find({
        product_id: { $in: recommendations.map(r => r.product_id.toString()) },
    });

    const mappedRecommendations = recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id === rec.product_id);
        return {
            ...rec,
            productDetails: product
                ? {
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    rating: product.rating,
                    brand: product.brand,
                    MainImage: product.MainImage,
                    description: product.description,
                    type: product.type
                }
                : null,
        };
    });

    // Sort: products with same type or category as input go to the end
    return mappedRecommendations.sort((a, b) => {
        const aType = a.productDetails?.type;
        const bType = b.productDetails?.type;
        const aCategory = a.productDetails?.category;
        const bCategory = b.productDetails?.category;

        if (!inputProductType && !inputProductCategory) return 0; // No sorting if input type/category unknown

        const aMatches = (aType === inputProductType || aCategory === inputProductCategory);
        const bMatches = (bType === inputProductType || bCategory === inputProductCategory);

        if (aMatches && !bMatches) return 1; // a matches, b doesn't -> a to end
        if (bMatches && !aMatches) return -1; // b matches, a doesn't -> b to end
        return 0; // Maintain original order
    });
};

exports.cartRecommendation = async (cart_items, k = 5) => {
    // Ensure cart_items are strings (API expects strings)
    cart_items = cart_items.map(item => String(item));

    const response = await axios.post(
        `${process.env.AI_API_BASE_URL}/cart-recommend`, // Use base URL from env
        { cart_items, k },
        { headers: { 'Content-Type': 'application/json' } }
    );

    let data = typeof response?.data === "string" ? JSON.parse(response.data.replace(/NaN/g, "0")) : response.data;
    const Recommendations = data?.recommendations || [];

    const recommendedProducts = await Product.find({
        product_id: { $in: Recommendations.map(r => r.product_id) },
    });

    return Recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id == rec.product_id);
        return {
            product_id: rec.product_id, // Explicitly include product_id
            brand: product ? product.brand : null, // Add brand from Product
            category_code: product ? `${product.category} ${product.type || ''}`.trim() : null, // Construct category_code
            name: product ? product.name : null, // Add name from Product
            productDetails: product
                ? {
                    _id: product._id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    rating: product.rating,
                    brand: product.brand,
                    MainImage: product.MainImage,
                    description: product.description,
                }
                : null,
        };
    });
};

exports.getTopTrendingProducts = async () => {
    const trendingProducts = await UserBehavior.aggregate([
        { $group: { _id: '$product_id', totalInteractions: { $sum: 1 } } },
        { $sort: { totalInteractions: -1 } },
        { $limit: 10 },
    ]);

    if (trendingProducts.length === 0) return [];

    const product_ids = trendingProducts.map(p => p._id);
    const products = await Product.find({ product_id: { $in: product_ids } });

    return products.map(product => {
        const trendData = trendingProducts.find(t => t._id === product.product_id);
        return {
            ...product.toObject(),
            totalInteractions: trendData ? trendData.totalInteractions : 0,
        };
    });
};

// exports.searchProducts = async (query) => {
//     if (!query) throw new Error("Search query is required.");
//     return await Product.find({
//         $or: [
//             { name: { $regex: query, $options: 'i' } },
//             { category: { $regex: query, $options: 'i' } },
//             { brand: { $regex: query, $options: 'i' } },
//             { description: { $regex: query, $options: 'i' } },
//         ],
//     }).limit(10);
// };

// Updated searchProducts with Qdrant and Filtering

exports.searchProducts = async (query, { offset = 0, limit = 20 } = {}) => {
    if (!query) throw new Error("Search query is required.");

    try {
        // Step 1: Embed the query using Jina AI
        const startEmbedding = Date.now();
        const queryVector = await getEmbeddingFromJinaAI(query);
        console.log(`Embedding query took: ${(Date.now() - startEmbedding) / 1000} seconds`);

        if (queryVector.every(val => val === 0)) {
            console.warn('Failed to generate a valid embedding for the query. Falling back to empty results.');
            return { results: [], total: 0 };
        }

        // Step 2: Prepare Qdrant query request with a filter for the name field
        const queryParams = {
            query: queryVector, // The query vector for vector similarity search
            filter: {
                must: [
                    {
                        key: 'name',
                        match: {
                            text: query // Use 'text' for substring matching
                        }
                    }
                ]
            },
            params: {
                hnsw_ef: 128, // Adjust for search efficiency/accuracy trade-off
                exact: false, // Use approximate search for better performance
            },
            limit: parseInt(limit),
            offset: parseInt(offset),
            with_payload: true,
            with_vector: false,
        };

        // Step 3: Call Qdrant API (use /query endpoint)
        const qdrantUrl = 'https://qdrant.d2f.io.vn/collections/test_v2/points/query';
        const startTime = Date.now();
        const response = await axios.post(qdrantUrl, queryParams, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.SWMCjlnWh7pD_BlK885iwtg30KtPXcngjNkTd8BuFAU',
            },
        });
        console.log(`Qdrant API query took: ${(Date.now() - startTime) / 1000} seconds`);
        console.log("reposne from qrdant", response)
        if (response.status !== 200 || response.data.status !== 'ok') {
            throw new Error('Qdrant query failed: ' + JSON.stringify(response.data));
        }

        const queryResults = response.data.result.points;
        if (!queryResults || queryResults.length === 0) {
            return {
                results: [],
                total: 0,
                message: 'No products found matching your search query.',
            };
        }

        // Log similarity scores for debugging
        queryResults.forEach(result => {
            console.log(`Product: ${result.payload.name}, Similarity Score: ${result.score}`);
        });

        // Step 4: Build a dictionary for faster lookups and check for exact match
        const qdrantDataMap = new Map();
        const queryLower = query.toLowerCase();
        let exactMatch = null;

        for (const result of queryResults) {
            if (!result.payload || !result.payload.product_id) continue;

            const productId = result.payload.product_id.toString();
            qdrantDataMap.set(productId, result.payload);

            const name = (result.payload.name || '').toLowerCase();
            // Check for exact match
            if (name === queryLower && !exactMatch) {
                exactMatch = result;
            }
        }

        // Step 5: Prepare filtered results
        let filteredResults;
        if (exactMatch) {
            filteredResults = [exactMatch];
        } else {
            filteredResults = queryResults.filter(result => result.payload && result.payload.product_id);
        }

        console.log('Filtered Query Results:', filteredResults.length);

        // Step 6: Extract product IDs
        const productIds = [...new Set(filteredResults.map(result => result.payload.product_id.toString()))];
        if (productIds.length === 0) {
            return {
                results: [],
                total: 0,
                message: 'No products found matching your search query.',
            };
        }

        // Step 7: Fetch from MongoDB with selected fields
        const startMongo = Date.now();
        const products = await Product.find({ product_id: { $in: productIds } })
            .select('product_id name category_code brand price MainImage')
            .lean();
        console.log(`MongoDB query took: ${(Date.now() - startMongo) / 1000} seconds`);

        // Step 8: Map Qdrant data to MongoDB products
        const startMapping = Date.now();
        const results = products.map(product => {
            const qdrantData = qdrantDataMap.get(product.product_id);
            const similarityScore = filteredResults.find(result => result.payload.product_id.toString() === product.product_id)?.score || 0;
            return {
                ...product,
                similarityScore, // Add similarity score to the response for debugging
                qdrantData: qdrantData
                    ? {
                        event_type: qdrantData.event_type,
                        event_time: qdrantData.event_time,
                        user_id: qdrantData.user_id,
                        user_session: qdrantData.user_session,
                        price: qdrantData.price,
                    }
                    : null,
            };
        });
        console.log(`Mapping took: ${(Date.now() - startMapping) / 1000} seconds`);

        return {
            results,
            total: filteredResults.length,
            message: filteredResults.length === 0 ? 'No products found matching your search query.' : undefined,
        };
    } catch (error) {
        console.error("Error querying products in Qdrant:", error.message, error.stack);
        throw new Error(`Failed to query products: ${error.message}`);
    }
};

exports.searchProductsPaginated = async ({ query, page = 1, limit = 20, brand, price_min, price_max, rating }) => {
    try {
        // Log collection and database
        console.log('Collection name:', Product.collection.name);
        console.log('Database name:', Product.db.db.databaseName);

        // Validate and parse pagination parameters
        const pageSize = Math.max(1, parseInt(limit, 10) || 20);
        let pageNum = parseInt(page, 10) || 1;
        if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

        console.log('Pagination params:', { page, limit, pageNum, pageSize });

        // Check if text index exists
        let hasTextIndex = false;
        try {
            const indexes = await Product.collection.getIndexes();
            console.log('Indexes:', JSON.stringify(indexes, null, 2));
            if (Array.isArray(indexes)) {
                hasTextIndex = indexes.some(index => index.key && index.key._fts === 'text');
            } else if (typeof indexes === 'object' && indexes !== null) {
                hasTextIndex = Object.values(indexes).some(index =>
                    Array.isArray(index) && index.some(([key, value]) => key === '_fts' && value === 'text')
                );
            }
            console.log('Has text index:', hasTextIndex);
        } catch (error) {
            console.warn('Error checking indexes:', error.message);
            hasTextIndex = false;
        }

        let searchFilter;
        if (query && hasTextIndex) {
            // Process query: add * to each term for prefix matching
            const textQuery = query.split(' ').map(term => `"${term}"`).join(' ');

            console.log('Raw query:', query);
            console.log('Processed text query:', textQuery);
            searchFilter = { $text: { $search: textQuery } };

            // Debug: Check matched documents
            const debugPipeline = [
                { $match: searchFilter },
                { $limit: 2 },
                { $project: { name: 1, category: 1, brand: 1, description: 1 } }
            ];
            const debugResults = await Product.aggregate(debugPipeline).exec();
            console.log('Debug matched documents:', JSON.stringify(debugResults, null, 2));
        } else {
            console.log('No text index or no query provided, using empty filter');
            searchFilter = {};
        }

        // Build additional filters
        const filterConditions = {};
        if (brand) {
            filterConditions.brand = { $regex: brand, $options: 'i' };
        }
        if (price_min || price_max) {
            filterConditions.price = {};
            const minPrice = price_min ? parseFloat(price_min) : undefined;
            const maxPrice = price_max ? parseFloat(price_max) : undefined;
            if (!isNaN(minPrice)) filterConditions.price.$gte = minPrice;
            if (!isNaN(maxPrice)) filterConditions.price.$lte = maxPrice;
            if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > maxPrice) {
                throw new Error('price_min cannot be greater than price_max');
            }
        }
        if (rating) {
            const ratingNum = Number(rating);
            if (!isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 5) {
                filterConditions.rating = ratingNum;
            } else {
                throw new Error('rating must be a number between 0 and 5');
            }
        }

        // Combine filters
        const combinedFilters = [];
        if (query && hasTextIndex) combinedFilters.push(searchFilter);
        if (Object.keys(filterConditions).length > 0) combinedFilters.push(filterConditions);

        const finalFilter = combinedFilters.length > 1 ? { $and: combinedFilters } : combinedFilters[0] || {};

        // Build aggregation pipeline
        const aggregationPipeline = [
            { $match: finalFilter },
        ];

        // Add text score and sorting if text search is used
        if (query && hasTextIndex) {
            aggregationPipeline.push(
                { $addFields: { score: { $meta: "textScore" } } },
                { $sort: { score: { $meta: "textScore" }, _id: 1 } }
            );
        } else {
            aggregationPipeline.push(
                { $sort: { _id: 1 } }
            );
        }

        // Add facet for pagination
        aggregationPipeline.push({
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [
                    { $skip: (pageNum - 1) * pageSize },
                    { $limit: pageSize },
                ],
            },
        });

        // Execute aggregation
        const result = await Product.aggregate(aggregationPipeline).exec();
        const totalProducts = result[0].metadata.length > 0 ? result[0].metadata[0].total : 0;
        const products = result[0].data;

        console.log('Total products found:', totalProducts);

        // Calculate total pages
        const totalPages = Math.ceil(totalProducts / pageSize);

        // Adjust pageNum if it exceeds totalPages
        if (totalPages === 0) {
            pageNum = 1;
        } else if (pageNum > totalPages) {
            pageNum = totalPages;
            const adjustedPipeline = [
                { $match: finalFilter },
            ];
            if (query && hasTextIndex) {
                adjustedPipeline.push(
                    { $addFields: { score: { $meta: "textScore" } } },
                    { $sort: { score: { $meta: "textScore" }, _id: 1 } }
                );
            } else {
                adjustedPipeline.push(
                    { $sort: { _id: 1 } }
                );
            }
            adjustedPipeline.push(
                { $skip: (pageNum - 1) * pageSize },
                { $limit: pageSize }
            );
            const adjustedResult = await Product.aggregate(adjustedPipeline).exec();
            return {
                products: adjustedResult,
                totalProducts,
                totalPages,
                currentPage: pageNum,
                pageSize,
            };
        }

        return {
            products,
            totalProducts,
            totalPages,
            currentPage: pageNum,
            pageSize,
        };
    } catch (error) {
        console.error('Error in searchProductsPaginated:', error.message, error.stack);
        throw new Error(`Failed to search products: ${error.message}`);
    }
};