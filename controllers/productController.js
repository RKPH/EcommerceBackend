const productService = require('../Services/productService');
const updateImageColumns = require('../Data/Update');

// Controller to get all products
exports.getAllProducts = async (req, res) => {
    try {
        const { page, limit, category, type, search } = req.query;
        const result = await productService.getAllProducts({ page, limit, category, type, search });

        res.json({
            status: "success",
            message: "Products retrieved successfully",
            data: result.products,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                itemsPerPage: result.itemsPerPage,
            },
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

// Controller to get a product by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const { product, productId } = await productService.getProductById(id);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: `Product with product_id ${productId} not found`,
                data: null,
            });
        }
        res.json({
            status: 'success',
            message: `Product with product_id ${productId} retrieved successfully`,
            data: product,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to create a new product
exports.addProduct = async (req, res) => {
    const { name, price, category, type, stock, shortDescription, mainImage, brand } = req.body;
    try {
        const newProduct = await productService.addProduct({ name, price, category, type, stock, shortDescription, mainImage, brand });
        res.status(201).json({
            status: "success",
            message: "Product added successfully",
            data: newProduct,
        });
    } catch (error) {
        res.status(error.message.includes("Invalid product data") ? 400 : 500).json({
            status: "error",
            message: error.message,
        });
    }
};

// Controller to get all distinct types
exports.getAllTypes = async (req, res) => {
    try {
        const types = await productService.getAllTypes();
        res.json({ status: 'success', message: 'Types retrieved successfully', data: types });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to get types by category
exports.getTypesByCategory = async (req, res) => {
    const { category } = req.params;
    try {
        const types = await productService.getTypesByCategory(category);
        res.json({ status: "success", message: "Types retrieved successfully", data: types });
    } catch (error) {
        res.status(error.message.includes("Category is required") ? 400 : 500).json({
            status: "error",
            message: error.message,
        });
    }
};

// Controller to get all distinct categories
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await productService.getAllCategories();
        res.json({ status: 'success', message: 'Categories retrieved successfully', data: categories });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to get products by type
exports.getProductByTypes = async (req, res) => {
    const { type } = req.params;
    const { page, brand, price_min, price_max, rating } = req.query;
    try {
        const result = await productService.getProductByTypes({ type, page, brand, price_min, price_max, rating });
        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to get products by category
exports.getProductsByCategories = async (req, res) => {
    const { category } = req.params;
    const { type, page, brand, price_min, price_max, rating } = req.query;
    try {
        const result = await productService.getProductsByCategories({ category, type, page, brand, price_min, price_max, rating });
        res.json({
            status: 'success',
            message: 'Products retrieved successfully',
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to get recommendations
exports.getRecommendations = async (req, res) => {
    const { product_id } = req.params;
    try {
        const detailedRecommendations = await productService.getRecommendations(product_id);
        res.json({
            status: 'success',
            message: 'Recommendations retrieved successfully',
            data: detailedRecommendations,
        });
    } catch (error) {
        res.status(error.message.includes("No recommendations found") ? 404 : 500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller for session-based recommendations
exports.sessionBasedRecommendation = async (req, res) => {
    const { user_id, product_id } = req.body;
    try {
        const detailedRecommendations = await productService.sessionBasedRecommendation({ user_id, product_id });
        res.json({
            status: 'success',
            message: 'Recommendations retrieved successfully',
            data: detailedRecommendations,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller for anonymous recommendations (guest users)
exports.anonymousRecommendation = async (req, res) => {
    const { product_id } = req.body;
    try {
        const detailedRecommendations = await productService.anonymousRecommendation(product_id);
        res.json({
            status: 'success',
            message: 'Anonymous recommendations retrieved successfully',
            data: detailedRecommendations,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to get 10 products with the highest trending_score
exports.getTopTrendingProducts = async (req, res) => {
    try {
        const productsWithTrend = await productService.getTopTrendingProducts();
        if (productsWithTrend.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No trending products found', data: [] });
        }
        res.json({ status: 'success', message: 'Top trending products retrieved successfully', data: productsWithTrend });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Controller to update product image
exports.updateProductImage = async (req, res) => {
    const { type, brand } = req.body;
    if (!type || !brand) {
        return res.status(400).json({ error: "Type and brand are required." });
    }
    try {
        const result = await updateImageColumns(type, brand);
        return res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
};

// Controller to search products
exports.searchProducts = async (req, res) => {
    const { query } = req.query;
    try {
        const products = await productService.searchProducts(query);
        res.json({
            status: 'success',
            message: 'Search results retrieved successfully',
            data: products,
        });
    } catch (error) {
        res.status(error.message.includes("Search query is required") ? 400 : 500).json({
            status: 'error',
            message: error.message,
        });
    }
};

// Controller to search products with pagination
exports.searchProductsPaginated = async (req, res) => {
    const { query, page, limit, brand, price_min, price_max, rating } = req.query;
    try {
        const result = await productService.searchProductsPaginated({ query, page, limit, brand, price_min, price_max, rating });
        res.json({
            status: 'success',
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// Controller to delete a product
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const { deletedProduct, productId } = await productService.deleteProduct(id);
        if (!deletedProduct) {
            return res.status(404).json({
                status: 'error',
                message: `Product with product_id ${productId} not found.`,
            });
        }
        res.json({
            status: 'success',
            message: `Product with product_id ${productId} deleted successfully.`,
            data: deletedProduct,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};