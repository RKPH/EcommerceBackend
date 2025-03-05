
const Product = require('../models/products');
const Cart = require('../models/cart');

exports.addProductToCart = async (req, res) => {
    const { productId, quantity} = req.body; // Extract product details from request body
    const { userId } = req.user; // Extract userId from authenticated user's information

    console.log(req.body);
    try {
        // Validate input
        if (!productId || !quantity ) {
            return res.status(400).json({
                status: 'error',
                message: 'Product ID, quantity are required',
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
        if(product.stock<quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'This product is out of stock',
            })
        }

        // Check if the cart item already exists for this user with the same productId, color, and size
        let cartItem = await Cart.findOne({
            productID: productId,
            user: userId,

        });

        if (cartItem) {
            // If cart item exists (same product, color, and size), update the quantity
            cartItem.quantity += quantity;
            await cartItem.save();

            // Count cart items belonging to the user
            const cartCount = await Cart.countDocuments({ user: userId });

            return res.status(200).json({
                status: 'success',
                message: 'Product quantity updated in cart successfully',
                data: cartItem,
                cartCount,
            });
        } else {
            // If cart item does not exist, create a new cart item
            const newCartItem = new Cart({
                productID: productId,
                product: product._id,
                quantity,

                user: userId,
            });
            await newCartItem.save();

            // Count cart items belonging to the user
            const cartCount = await Cart.countDocuments({ user: userId });

            return res.status(201).json({
                status: 'success',
                message: 'Product added to cart successfully',
                data: newCartItem,
                Length: cartCount,
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
// @route   PUT /api/v1/cart/update
// @access  Private
exports.updateCartItem = async (req, res) => {
    const { cartItemID, quantity } = req.body; // Match the exact case from the request body
    console.log(req.body); // Check the body to ensure you are receiving the correct data
    console.log(cartItemID, typeof(cartItemID)); // Log the extracted values to the console

    try {
        // Validate input
        if (!quantity) {
            return res.status(400).json({
                status: 'error',
                message: 'Quantity is required',
            });
        }

        // Check if the cart item exists
        let cartItem = await Cart.findById(cartItemID).populate('product');  // Ensure product details are available
        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found',
            });
        }

        // Check if the product is out of stock
        if (quantity > cartItem.product.stock) {
            return res.status(400).json({
                status: 'error',
                message: `Only ${cartItem.product.stock} item(s) available in stock`,
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


// @desc    Remove a product from the cart
// @route   DELETE /api/v1/cart/remove
// @access  Private
exports.removeCartItem = async (req, res) => {
    const { cartItemID } = req.body; // Extract cart item ID from request body
    const { userId } = req.user; // Extract user ID from the authenticated user

    try {
        // Validate input
        if (!cartItemID) {
            return res.status(400).json({
                status: 'error',
                message: 'Cart item ID is required',
            });
        }

        // Check if the cart item exists and belongs to the user
        const cartItem = await Cart.findOne({ _id: cartItemID, user: userId });
        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found or does not belong to the user',
            });
        }

        // Remove the cart item
        await Cart.findByIdAndDelete(cartItemID);

        // Respond with success message
        return res.status(200).json({
            status: 'success',
            message: 'Cart item removed successfully',
        });
    } catch (error) {
        console.error('Error removing cart item:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
};
