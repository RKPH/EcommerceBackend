const { addProductToCart, getCartItems, updateCartItem, removeCartItem } = require('../Services/cartService');

// @desc    Add a product to the cart
// @route   POST /api/v1/cart/add
// @access  Private
exports.addProductToCart = async (req, res) => {
    const { productId, quantity } = req.body; // Extract product details from request body
    const { userId } = req.user; // Extract userId from authenticated user's information

    console.log(req.body);
    try {
        const { cartItem, cartCount } = await addProductToCart(productId, quantity, userId);

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
        console.error('Error adding product to cart:', error.message);
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
        const cartItems = await getCartItems(userId);
        return res.status(200).json({
            status: 'success',
            message: 'Cart items retrieved successfully',
            data: cartItems,
        });
    } catch (error) {
        console.error('Error retrieving cart items:', error.message);
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
    console.log(req.body); // Check the body to ensure you are receiving the correct data
    console.log(cartItemID, typeof(cartItemID)); // Log the extracted values to the console

    try {
        const updatedCartItem = await updateCartItem(cartItemID, quantity);
        return res.status(200).json({
            status: 'success',
            message: 'Cart item updated successfully',
            data: updatedCartItem,
        });
    } catch (error) {
        console.error('Error updating cart item:', error.message);
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
        await removeCartItem(cartItemID, userId);
        return res.status(200).json({
            status: 'success',
            message: 'Cart item removed successfully',
        });
    } catch (error) {
        console.error('Error removing cart item:', error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error',
        });
    }
};

