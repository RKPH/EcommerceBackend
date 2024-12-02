const expressJs = require('express');
const router = expressJs.Router();
const {addProductToCart, getCartItems} = require('../controllers/cartController');
const verifyToken = require('../middlewares/verifyToken');

router.post('/add', verifyToken , addProductToCart);

router.get('/get', verifyToken, getCartItems);

module.exports = router;