const productService = require('../Services/productService');

//get all products
exports.getAllProducts = async (req, res) => {
    try {
        const { page, limit, category, type, search } = req.query;

        // Kiểm tra tham số đầu vào
        if (page && isNaN(parseInt(page))) {
            return res.status(400).json({
                status: "error",
                message: "Page must be a valid number.",
            });
        }
        if (limit && isNaN(parseInt(limit))) {
            return res.status(400).json({
                status: "error",
                message: "Limit must be a valid number.",
            });
        }

        const result = await productService.getAllProducts({ page, limit, category, type, search });

        if (!result.products || result.products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No products found.",
                data: [],
                pagination: {
                    currentPage: result.currentPage,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: result.itemsPerPage,
                },
            });
        }

        res.status(200).json({
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

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve products due to a server error.",
        });
    }
};

//get by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                status: "error",
                message: "Invalid product ID. Must be a number.",
            });
        }

        const { product, productId } = await productService.getProductById(id);
        if (!product) {
            return res.status(404).json({
                status: "error",
                message: `Product with product_id ${productId} not found`,
                data: null,
            });
        }

        res.status(200).json({
            status: "success",
            message: `Product with product_id ${productId} retrieved successfully`,
            data: product,
        });
    } catch (error) {

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve product due to a server error.",
        });
    }
};

// get all types
exports.getAllTypes = async (req, res) => {
    try {
        const types = await productService.getAllTypes();

        if (!types || types.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No types found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Types retrieved successfully",
            data: types,
        });
    } catch (error) {

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve types due to a server error.",
        });
    }
};

exports.getTypesByCategory = async (req, res) => {
    const { category } = req.params;

    // Trim the category and check if it's empty
    const trimmedCategory = category ? category.trim() : category;
    if (!trimmedCategory) {
        return res.status(400).json({
            status: "error",
            message: "Category is required.",
        });
    }

    try {
        const types = await productService.getTypesByCategory(trimmedCategory);
        if (!types || types.length === 0) {
            return res.status(404).json({
                status: "error",
                message: `No types found for category ${trimmedCategory}.`,
                data: [],
            });
        }
        res.status(200).json({
            status: "success",
            message: "Types retrieved successfully",
            data: types,
        });
    } catch (error) {

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve types due to a server error.",
        });
    }
};

// get all category
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await productService.getAllCategories();

        if (!categories || categories.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No categories found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Categories retrieved successfully",
            data: categories,
        });
    } catch (error) {

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve categories due to a server error.",
        });
    }
};

// get products by types
exports.getProductByTypes = async (req, res) => {
    const { type } = req.params;
    const { page, brand, price_min, price_max, rating } = req.query;
    if (!type) {
        return res.status(400).json({
            status: "error",
            message: "Type is required.",
        });
    }

    try {
        if (page && isNaN(parseInt(page))) {
            return res.status(400).json({
                status: "error",
                message: "Page must be a valid number.",
            });
        }
        const result = await productService.getProductByTypes({ type, page, brand, price_min, price_max, rating });
        if (!result.products || result.products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No products found for this type.",
                data: [],
                pagination: {
                    totalProducts: result.totalProducts || 0,
                    totalPages: result.totalPages || 0,
                    currentPage: result.currentPage,
                    pageSize: result.pageSize,
                },
            });
        }
        res.status(200).json({
            status: "success",
            message: "Products retrieved successfully",
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {

        res.status(error.message.includes("No products found") ? 404 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve products due to a server error.",
        });
    }
};

// get products by ctegory
exports.getProductsByCategories = async (req, res) => {
    const { category } = req.params;
    const { type, page, brand, price_min, price_max, rating } = req.query;
    console.log("category", category);
    if (!category || category === "") {
        return res.status(400).json({
            status: "error",
            message: "Category is required.",
        });
    }

    try {
        if (page && isNaN(parseInt(page))) {
            return res.status(400).json({
                status: "error",
                message: "Page must be a valid number.",
            });
        }
        const result = await productService.getProductsByCategories({ category, type, page, brand, price_min, price_max, rating });
        if (!result.products || result.products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No products found for this category.",
                data: [],
                pagination: {
                    totalProducts: result.totalProducts || 0,
                    totalPages: result.totalPages || 0,
                    currentPage: result.currentPage,
                    pageSize: result.pageSize,
                },
            });
        }
        res.status(200).json({
            status: "success",
            message: "Products retrieved successfully",
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {

        res.status(error.message.includes("No products found") ? 404 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve products due to a server error.",
        });
    }
};

// get contet base recommendation
exports.getRecommendations = async (req, res) => {
    const { product_id } = req.params;
    try {
        if (!product_id || isNaN(parseInt(product_id))) {
            return res.status(400).json({
                status: "error",
                message: "Invalid product ID. Must be a number.",
            });
        }

        const detailedRecommendations = await productService.getRecommendations(product_id);

        if (!detailedRecommendations || detailedRecommendations.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No recommendations found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Recommendations retrieved successfully",
            data: detailedRecommendations,
        });
    } catch (error) {

        res.status(error.message.includes("No recommendations found") ? 404 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve recommendations due to a server error.",
        });
    }
};

// get session base
exports.sessionBasedRecommendation = async (req, res) => {
    const { user_id, product_id } = req.body;
    try {
        if (!user_id || !product_id) {
            return res.status(400).json({
                status: "error",
                message: "User ID and Product ID are required.",
            });
        }

        if (isNaN(parseInt(product_id))) {
            return res.status(400).json({
                status: "error",
                message: "Invalid product ID. Must be a number.",
            });
        }

        const detailedRecommendations = await productService.sessionBasedRecommendation({ user_id, product_id });

        if (!detailedRecommendations || detailedRecommendations.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No recommendations found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Recommendations retrieved successfully",
            data: detailedRecommendations,
        });
    } catch (error) {

        res.status(error.message.includes("No recommendations found") ? 404 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve recommendations due to a server error.",
        });
    }
};

// get recommendation for anonymous users
exports.anonymousRecommendation = async (req, res) => {
    const { product_id } = req.body;
    try {
        if (!product_id || isNaN(parseInt(product_id))) {
            return res.status(400).json({
                status: "error",
                message: "Invalid product ID. Must be a number.",
            });
        }

        const detailedRecommendations = await productService.anonymousRecommendation(product_id);

        if (!detailedRecommendations || detailedRecommendations.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No recommendations found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Anonymous recommendations retrieved successfully",
            data: detailedRecommendations,
        });
    } catch (error) {

        res.status(error.message.includes("No recommendations found") ? 404 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve recommendations due to a server error.",
        });
    }
};

// get top trending propductrs
exports.getTopTrendingProducts = async (req, res) => {
    try {
        const productsWithTrend = await productService.getTopTrendingProducts();

        if (!productsWithTrend || productsWithTrend.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No trending products found.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Top trending products retrieved successfully",
            data: productsWithTrend,
        });
    } catch (error) {

        res.status(500).json({
            status: "error",
            message: error.message || "Failed to retrieve trending products due to a server error.",
        });
    }
};

// Search using qdrant
exports.searchProducts = async (req, res) => {
    const { query } = req.query;
    try {
        if (!query) {
            return res.status(400).json({
                status: "error",
                message: "Search query is required.",
            });
        }

        const products = await productService.searchProducts(query);

        if (!products || products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No products found for this query.",
                data: [],
            });
        }

        res.status(200).json({
            status: "success",
            message: "Search results retrieved successfully",
            data: products,
        });
    } catch (error) {

        res.status(error.message.includes("Search query is required") ? 400 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve search results due to a server error.",
        });
    }
};

// Search full
exports.searchProductsPaginated = async (req, res) => {
    const { query, page, limit, brand, price_min, price_max, rating } = req.query;
    try {
        if (!query) {
            return res.status(400).json({
                status: "error",
                message: "Search query is required.",
            });
        }

        if (page && isNaN(parseInt(page))) {
            return res.status(400).json({
                status: "error",
                message: "Page must be a valid number.",
            });
        }
        if (limit && isNaN(parseInt(limit))) {
            return res.status(400).json({
                status: "error",
                message: "Limit must be a valid number.",
            });
        }

        const result = await productService.searchProductsPaginated({ query, page, limit, brand, price_min, price_max, rating });

        if (!result.products || result.products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No products found for this query.",
                data: [],
                pagination: {
                    totalProducts: result.totalProducts || 0,
                    totalPages: result.totalPages || 0,
                    currentPage: result.currentPage,
                    pageSize: result.pageSize,
                },
            });
        }

        res.status(200).json({
            status: "success",
            message: "Search results retrieved successfully",
            data: result.products,
            pagination: {
                totalProducts: result.totalProducts,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            },
        });
    } catch (error) {

        res.status(error.message.includes("Search query is required") ? 400 : 500).json({
            status: "error",
            message: error.message || "Failed to retrieve search results due to a server error.",
        });
    }
};

