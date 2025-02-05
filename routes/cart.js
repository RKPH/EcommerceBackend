const expressJs = require('express');
const router = expressJs.Router();
const {addProductToCart, getCartItems ,updateCartItem, removeCartItem} = require('../controllers/cartController');
const verifyToken = require('../middlewares/verifyToken');

router.post('/add', verifyToken , addProductToCart);

router.get('/get', verifyToken, getCartItems);

router.put('/update', verifyToken, updateCartItem)

router.delete('/delete', verifyToken,removeCartItem );

module.exports = router;