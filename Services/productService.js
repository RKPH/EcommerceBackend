const Product = require('../models/products');
const UserBehavior = require('../models/UserBehaviors');
const {embed} = require('../Services/EmbedingServices');
const qdrantConfig = require('../config/qdrantConfig'); // Adjusted path
const axios = require('axios');

// Utility to generate a unique product_id
const generateUniqueProductId = async () => {
    let product_id;
    let isUnique = false;

    while (!isUnique) {
        product_id = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8-digit random number
        const existingProduct = await Product.findOne({ product_id });
        if (!existingProduct) {
            isUnique = true;
        }
    }
    return product_id;
};

// Service functions
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

exports.addProduct = async ({ name, price, category, type, stock, shortDescription, mainImage, brand }) => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!name || !category || !type || isNaN(parsedPrice) || parsedPrice <= 0 || isNaN(parsedStock) || parsedStock < 0 || !brand || !mainImage) {
        throw new Error("Invalid product data. Please ensure all required fields are provided and valid.");
    }

    const product_id = await generateUniqueProductId();
    const newProduct = new Product({
        product_id,
        name,
        category,
        type,
        price: parsedPrice,
        description: shortDescription,
        stock: parsedStock,
        brand,
        MainImage: mainImage,
        rating: 0,
    });

    await newProduct.save();
    return newProduct;
};

exports.getAllTypes = async () => {
    return await Product.distinct('type');
};

exports.getTypesByCategory = async (category) => {
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
    product_id=product_id.toString();
    const response = await axios.post("http://dockersetup-flask-app-1:5000/predict", { product_id }, { headers: { 'Content-Type': 'application/json' } });
    if (!response.data?.recommendations) throw new Error("No recommendations found");

    const recommendations = response.data.recommendations;
    const recommendedProducts = await Product.find({ product_id: { $in: recommendations.map(r => r.product_id) } });

    return recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id == rec.product_id);
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
            } : null,
        };
    });
};

exports.sessionBasedRecommendation = async ({ user_id, product_id }) => {
    user_id=user_id.toString();
    product_id = Number(product_id);
    console.log("type of u_id:", typeof(user_id));
    console.log("type of u_id:", typeof(product_id));
    const response = await axios.post("http://dockersetup-flask-app-1:5000/session-recommend", { user_id, product_id }, { headers: { 'Content-Type': 'application/json' } });
    let data = typeof response?.data === "string" ? JSON.parse(response.data.replace(/NaN/g, "0")) : response.data;
    const Recommendations = data?.recommendations || [];

    const recommendedProducts = await Product.find({ product_id: { $in: Recommendations.map(r => r.product_id) } });
    return Recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id == rec.product_id);
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
};

exports.anonymousRecommendation = async (product_id) => {
    product_id = Number(product_id);
    const response = await axios.post("http://dockersetup-flask-app-1:5000/anonymous-recommend", { product_id }, { headers: { 'Content-Type': 'application/json' } });
    let data = typeof response?.data === "string" ? JSON.parse(response.data.replace(/NaN/g, "0")) : response.data;
    const Recommendations = data?.recommendations || [];

    const recommendedProducts = await Product.find({ product_id: { $in: Recommendations.map(r => r.product_id) } });
    return Recommendations.map(rec => {
        const product = recommendedProducts.find(p => p.product_id == rec.product_id);
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

exports.searchProducts = async (query, { category, rating } = {}) => {
    if (!query) throw new Error("Search query is required.");

    try {
        // Build Qdrant filter based on category and rating
        const filter = {
            must: [],
        };

        // Add filter for category if provided
        if (category) {
            filter.must.push({
                key: 'category_code',
                match: {
                    value: category,
                },
            });
        }

        // Add filter for rating if provided (assuming rating is stored as a number in the payload)
        if (rating) {
            filter.must.push({
                key: 'price', // Replace with 'rating' if that's the correct field in your payload
                match: {
                    value: Number(rating),
                },
            });
        }

        // Prepare the scroll request payload
        const scrollParams = {
            filter: filter.must.length > 0 ? filter : undefined,
            limit: 100, // Fetch more points to allow for post-filtering
            with_payload: true,
            with_vector: false,
        };

        // Directly call the Qdrant scroll API endpoint
        const qdrantUrl = 'http://103.155.161.100:6333/collections/recommendation_system/points/scroll';
        const response = await axios.post(qdrantUrl, scrollParams, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.SWMCjlnWh7pD_BlK885iwtg30KtPXcngjNkTd8BuFAU',
            },
        });

        // Check if the response is successful
        if (response.status !== 200 || response.data.status !== 'ok') {
            throw new Error('Qdrant scroll failed: ' + JSON.stringify(response.data));
        }

        const scrollResults = response.data.result.points;

        // Post-filter results to match the query in the 'name' field (case-insensitive substring match)
        const queryLower = query.toLowerCase();
        const filteredResults = scrollResults.filter((result) => {
            const name = result.payload?.name || '';
            return name.toLowerCase().includes(queryLower);
        });

        console.log('Filtered Scroll Results:', filteredResults);

        // Extract product_ids from filtered Qdrant results
        const productIds = filteredResults
            .filter((result) => result.payload && result.payload.product_id)
            .map((result) => result.payload.product_id.toString());

        if (productIds.length === 0) {
            return []; // No matching products found
        }

        // Build MongoDB filter
        const mongoFilter = { product_id: { $in: productIds } };

        // Fetch detailed product data from MongoDB
        const products = await Product.find(mongoFilter).lean();

        // Map Qdrant results to MongoDB product data
        return products.map((product) => {
            const qdrantData = filteredResults.find((result) => result.payload.product_id.toString() === product.product_id);
            return {
                ...product,
                qdrantData: qdrantData
                    ? {
                        event_type: qdrantData.payload.event_type,
                        event_time: qdrantData.payload.event_time,
                        user_id: qdrantData.payload.user_id,
                        user_session: qdrantData.payload.user_session,
                    }
                    : null,
            };
        });
    } catch (error) {
        console.error("Error scrolling products in Qdrant:", error);
        throw new Error(`Failed to scroll products: ${error.message}`);
    }
};

exports.searchProductsPaginated = async ({ query, page = 1, limit = 20, brand, price_min, price_max, rating }) => {
    const pageSize = parseInt(limit, 10) || 20;
    let pageNum = parseInt(page, 10) || 1;
    if (isNaN(pageNum) || pageNum <= 0) pageNum = 1;

    const searchFilter = {
        $or: [
            { name: { $regex: query || '', $options: 'i' } },
            { category: { $regex: query || '', $options: 'i' } },
            { brand: { $regex: query || '', $options: 'i' } },
            { description: { $regex: query || '', $options: 'i' } },
        ],
    };

    const filterConditions = {};
    if (brand) filterConditions.brand = { $regex: brand, $options: 'i' };
    if (price_min || price_max) {
        filterConditions.price = {};
        if (price_min) filterConditions.price.$gte = parseFloat(price_min);
        if (price_max) filterConditions.price.$lte = parseFloat(price_max);
    }
    if (rating) filterConditions.rating = Number(rating);

    const combinedFilters = [searchFilter];
    if (Object.keys(filterConditions).length > 0) combinedFilters.push(filterConditions);

    const finalFilter = combinedFilters.length > 1 ? { $and: combinedFilters } : searchFilter;

    const totalProducts = await Product.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalProducts / pageSize);
    if (pageNum > totalPages) pageNum = totalPages;

    const products = await Product.find(finalFilter)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize);

    return { products, totalProducts, totalPages, currentPage: pageNum, pageSize };
};

exports.deleteProduct = async (id) => {
    const productId = parseInt(id, 10);
    const deletedProduct = await Product.findOneAndDelete({ product_id: productId });
    return { deletedProduct, productId };
};