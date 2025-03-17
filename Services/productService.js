const Product = require('../models/products');
const UserBehavior = require('../models/UserBehaviors');
const Order = require('../models/Order');
const Review = require('../models/reviewSchema');
const axios = require('axios');


// Service functions
exports.createProduct = async ({
                                 name,
                                 price,
                                 category,
                                 type,
                                 brand,
                                 stock,
                                 mainImage,
                                 description
                             }) => {
    try {
        // Validate required fields
        if (!name || !price || !category || !type || !brand || !stock || !mainImage) {
            throw new Error('Name, price, category, type, brand, stock, and MainImage are required.');
        }

        // Validate numeric fields
        const parsedPrice = parseFloat(price);
        const parsedStock = parseInt(stock, 10);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            throw new Error('Price must be a positive number.');
        }
        if (isNaN(parsedStock) || parsedStock < 0) {
            throw new Error('Stock must be a non-negative integer.');
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
            throw new Error('Failed to create product.');
        }

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
        if (error.name === 'ValidationError') {
            throw new Error('Validation error: ' + Object.values(error.errors).map(err => err.message).join(', '));
        }
        if (error.code === 11000 && error.keyPattern?.product_id) {
            throw new Error('Product ID already exists.');
        }
        throw error; // Re-throw for unexpected errors
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

exports.searchProducts = async (query, { category, priceMin, priceMax, offset = 0, limit = 20 } = {}) => {
    if (!query) throw new Error("Search query is required.");

    try {
        // Build Qdrant filter
        const filter = { must: [] };
        if (query) {
            filter.must.push({
                should: [
                    { key: 'name', match: { text: query } },
                    { key: 'category_code', match: { text: query } },
                    { key: 'brand', match: { text: query } }
                ],
            });
        }
        if (category) {
            filter.must.push({
                key: 'category_code',
                match: { value: category },
            });
        }
        if (priceMin || priceMax) {
            const priceFilter = { key: 'price', range: {} };
            if (priceMin) priceFilter.range.gte = Number(priceMin);
            if (priceMax) priceFilter.range.lte = Number(priceMax);
            filter.must.push(priceFilter);
        }

        // Prepare Qdrant scroll request
        const scrollParams = {
            filter: filter.must.length > 0 ? filter : undefined,
            limit: parseInt(limit), // Reduced limit for faster response
            offset: parseInt(offset), // Add offset for pagination
            with_payload: true,
            with_vector: false,
        };

        // Call Qdrant API
        const qdrantUrl = 'http://103.155.161.100:6333/collections/recommendation_system/points/scroll';
        const startTime = Date.now();
        const response = await axios.post(qdrantUrl, scrollParams, {
            headers: {
                'Content-Type': 'application/json',
                'api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.SWMCjlnWh7pD_BlK885iwtg30KtPXcngjNkTd8BuFAU',
            },
        });
        console.log(`Qdrant API callssss took: ${(Date.now() - startTime) / 1000} seconds`);

        if (response.status !== 200 || response.data.status !== 'ok') {
            throw new Error('Qdrant scroll failed: ' + JSON.stringify(response.data));
        }

        const scrollResults = response.data.result.points;
        if (!scrollResults || scrollResults.length === 0) {
            return { results: [], total: 0 };
        }

        // Build a dictionary for faster lookups
        const qdrantDataMap = new Map();
        const queryLower = query.toLowerCase();
        let exactMatch = null;

        // Single pass to build map and find exact match
        for (const result of scrollResults) {
            if (!result.payload || !result.payload.product_id) continue;
            const productId = result.payload.product_id.toString();
            qdrantDataMap.set(productId, result.payload);

            const name = (result.payload.name || '').toLowerCase();
            if (name === queryLower && !exactMatch) {
                exactMatch = result;
            }
        }

        // Prepare filtered results
        let filteredResults;
        if (exactMatch) {
            filteredResults = [exactMatch];
        } else {
            filteredResults = scrollResults.filter(result => result.payload && result.payload.product_id);
        }

        console.log('Filtered Scroll Results:', filteredResults.length);

        // Extract product IDs
        const productIds = [...new Set(filteredResults.map(result => result.payload.product_id.toString()))];
        if (productIds.length === 0) {
            return { results: [], total: 0 };
        }

        // Build MongoDB filter
        const mongoFilter = { product_id: { $in: productIds } };

        // Fetch from MongoDB with selected fields
        const startMongo = Date.now();
        const products = await Product.find(mongoFilter)
            .select('product_id name category_code brand price')
            .lean();
        console.log(`MongoDB query took: ${(Date.now() - startMongo) / 1000} seconds`);

        // Map Qdrant data to MongoDB products
        const startMapping = Date.now();
        const results = products.map(product => {
            const qdrantData = qdrantDataMap.get(product.product_id);
            return {
                ...product,
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
            total: filteredResults.length, // Approximate total; use Qdrant count API for exact total if needed
        };
    } catch (error) {
        console.error("Error scrolling products in Qdrant:", error);
        throw new Error(`Failed to scroll products: ${error.message}`);
    }
};;

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

