const { addProductToCart, getCartItems, updateCartItem, removeCartItem } = require('../Services/cartService');

// @desc    Add a product to the cart
// @route   POST /api/v1/cart/add
// @access  Private
exports.addProductToCart = async (req, res) => {
    const { productId, quantity } = req.body; // Extract product details from request body
    const { userId } = req.user; // Extract userId from authenticated user's information

    console.log(req.body);
    try {
        // Validate inputs
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'productId and a positive quantity are required',
            });
        }

        const { cartItem, cartCount } = await addProductToCart(productId, quantity, userId);

        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or unable to add to cart',
            });
        }

        return cartItem.quantity === quantity
            ? res.status(201).json({
                status: 'success',
                message: 'Product added to cart successfully',
                data: cartItem,
                Length: cartCount,
            })
            : res.status(200).json({
                status: 'success',
                message: 'Product quantity updated in cart successfully',
                data: cartItem,
                cartCount,
            });
    } catch (error) {

        if (error.message.toLowerCase().includes('product not found')) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found',
            });
        }
        if (error.message.includes('Unauthorized')) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized to add product to cart',
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

// @desc    Get all cart items for a user
// @route   GET /api/v1/cart
// @access  Private
exports.getCartItems = async (req, res) => {
    const { userId } = req.user; // Extract userId from the authenticated user

    try {
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required',
            });
        }

        const cartItems = await getCartItems(userId);
        if (!cartItems) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart not found for this user',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Cart items retrieved successfully',
            data: cartItems,
        });
    } catch (error) {

        if (error.message.includes('Unauthorized')) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized to access cart',
            });
        }
        if (error.message.includes('Not found')) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart not found',
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

// @desc    Update quantity of a product in the cart
// @route   PUT /api/v1/cart/update
// @access  Private
exports.updateCartItem = async (req, res) => {
    const { cartItemID, quantity } = req.body; // Match the exact case from the request body



    try {
        // Validate inputs
        if (!cartItemID || quantity === undefined || quantity < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'cartItemID and a non-negative quantity are required',
            });
        }

        const updatedCartItem = await updateCartItem(cartItemID, quantity);
        if (!updatedCartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Cart item updated successfully',
            data: updatedCartItem,
        });
    } catch (error) {

        if (error.message.includes('Unauthorized')) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized to update cart item',
            });
        }
        if (error.message.includes('Not found')) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found',
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

// @desc    Remove a product from the cart
// @route   DELETE /api/v1/cart/remove
// @access  Private
exports.removeCartItem = async (req, res) => {
    const { cartItemID } = req.body; // Extract cart item ID from request body
    const { userId } = req.user; // Extract user ID from the authenticated user

    try {
        // Validate inputs
        if (!cartItemID || !userId) {
            return res.status(400).json({
                status: 'error',
                message: 'cartItemID and userId are required',
            });
        }

        const result = await removeCartItem(cartItemID, userId);
        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found or not authorized to remove',
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Cart item removed successfully',
        });
    } catch (error) {

        if (error.message.includes('Unauthorized')) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized to remove cart item',
            });
        }
        if (error.message.includes('Not found')) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found',
            });
        }
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};