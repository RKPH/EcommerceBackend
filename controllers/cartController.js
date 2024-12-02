
const Product = require('../models/products');
const Cart = require('../models/cart');


exports.addProductToCart = async (req, res) => {
    const { productId, quantity } = req.body; // Extract productId and quantity from the request body
    const { userId} = req.user;// Extract userId from authenticated user's information
    console.log("userId in addProductToCart:", userId);
    try {
        // Validate input
        if (!productId || !quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID and quantity are required',
            });
        }

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found',
            });
        }
        console.log("product in addProductToCart:", product);

        // Check if the cart item already exists for this user
        let cartItem = await Cart.findOne({ product: productId, user: userId });

        if (cartItem) {
            // If cart item exists, update the quantity
            cartItem.quantity += quantity;
            await cartItem.save();

            return res.status(200).json({
                status: 'success',
                message: 'Product added to cart successfully',
                data: cartItem,
            });
        } else {
            // If cart item does not exist, create a new cart item
            const newCartItem = new Cart({
                product: productId,
                quantity,
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