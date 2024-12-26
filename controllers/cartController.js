
const Product = require('../models/products');
const Cart = require('../models/cart');


exports.addProductToCart = async (req, res) => {
    const { productId, quantity, color, size } = req.body; // Extract product details from request body
    const { userId } = req.user; // Extract userId from authenticated user's information

    console.log(req.body);
    try {
        // Validate input
        if (!productId || !quantity || !color) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID, quantity, color, and size are required',
            });
        }

        // Check if the product exists by productId
        const product = await Product.findOne({ productID: productId });
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found',
            });
        }

        // Check if the cart item already exists for this user with the same productId, color, and size
        let cartItem = await Cart.findOne({
            product: productId,
            user: userId,
            color,
            size // Match exact color and size
        });

        if (cartItem) {
            // If cart item exists (same product, color, and size), update the quantity
            cartItem.quantity += quantity;
            await cartItem.save();

            return res.status(200).json({
                status: 'success',
                message: 'Product quantity updated in cart successfully',
                data: cartItem,
            });
        } else {
            // If cart item does not exist, create a new cart item
            const newCartItem = new Cart({
                product: productId,
                quantity,
                color,
                size,
                user: userId,
            });
            await newCartItem.save();

            return res.status(201).json({
                status: 'success',
                message: 'Product added to cart successfully',
                data: newCartItem,
            });
        }
    } catch (error) {
        console.error('Error adding product to cart:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

// @desc    Get all cart items for a user
// @route   GET /api/v1/cart
// @access  Private
exports.getCartItems = async (req, res) => {
    const { userId} = req.user; // Extract userId from the authenticated user

    try {
        // Fetch cart items for the user and populate product details
        const cartItems = await Cart.find({ user: userId }).populate('product');

        // Check if the cart is empty
        if (!cartItems || cartItems.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart is empty',
            });
        }

        // Respond with the cart items
        return res.status(200).json({
            status: 'success',
            message: 'Cart items retrieved successfully',
            data: cartItems,
        });
    } catch (error) {
        console.error('Error retrieving cart items:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};

// @desc    Update quantity of a product in the cart
// @route   PUT /api/v1/cart/:cartItemId
// @access  Private
exports.updateCartItem = async (req, res) => {
    const { cartItemId } = req.params; // Extract cartItemId from request parameters
    const { quantity } = req.body; // Extract updated quantity from request body

    try {
        // Validate input
        if (!quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'Quantity is required',
            });
        }

        // Check if the cart item exists
        let cartItem = await Cart.findById(cartItemId);
        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found',
            });
        }

        // Update the quantity of the cart item
        cartItem.quantity = quantity;
        await cartItem.save();

        // Respond with the updated cart item
        return res.status(200).json({
            status: 'success',
            message: 'Cart item updated successfully',
            data: cartItem,
        });
    } catch (error) {
        console.error('Error updating cart item:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};