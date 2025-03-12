const Product = require('../models/products');
const Cart = require('../models/cart');

// Service to add a product to the cart
const addProductToCart = async (productId, quantity, userId) => {
    // Validate input
    if (!productId || !quantity) {
        throw new Error('Product ID and quantity are required');
    }

    // Check if the product exists by productId
    const product = await Product.findOne({ product_id: productId });
    if (!product) {
        throw new Error('Product not found');
    }
    if (product.stock < quantity) {
        throw new Error('This product is out of stock');
    }

    // Check if the cart item already exists for this user with the same productId
    let cartItem = await Cart.findOne({
        productID: productId,
        user: userId,
    });

    if (cartItem) {
        // If cart item exists, update the quantity
        cartItem.quantity += quantity;
        await cartItem.save();
        const cartCount = await Cart.countDocuments({ user: userId });
        return { cartItem, cartCount };
    } else {
        // If cart item does not exist, create a new cart item
        const newCartItem = new Cart({
            productID: productId,
            product: product._id,
            quantity,
            user: userId,
        });
        await newCartItem.save();
        const cartCount = await Cart.countDocuments({ user: userId });
        return { cartItem: newCartItem, cartCount };
    }
};

// Service to get all cart items for a user
const getCartItems = async (userId) => {
    const cartItems = await Cart.find({ user: userId }).populate('product');
    if (!cartItems || cartItems.length === 0) {
        throw new Error('Cart is empty');
    }
    return cartItems;
};

// Service to update the quantity of a product in the cart
const updateCartItem = async (cartItemID, quantity) => {
    // Validate input
    if (!quantity) {
        throw new Error('Quantity is required');
    }

    // Check if the cart item exists
    const cartItem = await Cart.findById(cartItemID).populate('product');
    if (!cartItem) {
        throw new Error('Cart item not found');
    }

    // Check if the product is out of stock
    if (quantity > cartItem.product.stock) {
        throw new Error(`Only ${cartItem.product.stock} item(s) available in stock`);
    }

    // Update the quantity
    cartItem.quantity = quantity;
    await cartItem.save();
    return cartItem;
};

// Service to remove a product from the cart
const removeCartItem = async (cartItemID, userId) => {
    // Validate input
    if (!cartItemID) {
        throw new Error('Cart item ID is required');
    }

    // Check if the cart item exists and belongs to the user
    const cartItem = await Cart.findOne({ _id: cartItemID, user: userId });
    if (!cartItem) {
        throw new Error('Cart item not found or does not belong to the user');
    }

    // Remove the cart item
    await Cart.findByIdAndDelete(cartItemID);
    return true; // Indicate success
};

module.exports = {
    addProductToCart,
    getCartItems,
    updateCartItem,
    removeCartItem,
};