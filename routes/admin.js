const express = require("express");
const { getMonthlyRevenue, getProductTypeSales, getMostProductBuyEachType, getRevenueComparison, getOrderComparison,
    getTopRatedProducts, getWeeklyRevenue, getTopOrderedProductsController, getOrderDetails, updatePaymentStatus,
    updateRefundStatus, updateOrderStatus, getAllUsers, getUserDetails, updateUser, createUser, createProduct, deleteProduct
} = require("../controllers/AdminController");
const {getAllOrders, updateProduct, loginAdmin} = require("../controllers/AdminController");
const verifyToken = require('../middlewares/verifyToken');
const verifyAdmin = require('../middlewares/verifyAdmin');



const router = express.Router();

// Route to get monthly revenue (only paid orders)
router.get("/revenue", getMonthlyRevenue);

router.get("/WeeklyRevenue", getWeeklyRevenue );

router.get("/total" , getRevenueComparison);

router.get("/totalOrders", getOrderComparison);

router.get("/topRatedProducts", getTopRatedProducts);

router.get("/topOrderedProducts", getTopOrderedProductsController);
// Route to get total sales for each product type
router.get("/product-type-sales", getProductTypeSales);

// Route to get the most bought product in each type
router.get("/most-bought-product-type", getMostProductBuyEachType);

router.get("/allOrders", getAllOrders);

//products
router.post("/products/add",verifyToken, verifyAdmin ,createProduct);
router.put("/products/update/:id" , verifyToken, verifyAdmin ,updateProduct );
router.delete("/products/:product_id" , verifyToken, verifyAdmin,deleteProduct);

router.post("/login", loginAdmin)


//orders
router.get("/orders/:orderId", getOrderDetails )

router.put("/orders/updatePaymentStatus/:orderId", updatePaymentStatus);


//refund
router.put("/orders/updateRefundStatus/:orderId", updateRefundStatus);
router.put('/orders/updateOrderStatus/:orderId', updateOrderStatus);

//users
router.get("/users", getAllUsers)
router.get("/users/:id", getUserDetails)
router.put("/users/update/:id",verifyToken,verifyAdmin ,updateUser)
router.post("/users/create", verifyToken,verifyAdmin,createUser)

module.exports = router;
