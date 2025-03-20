const express = require("express");

const {getAllProducts,  createProduct, deleteProduct, importProducts, updateProduct} = require("../controllers/productController")// Add this line
const {getAllUsers, getUserDetails, updateUser, createUser, getUserComparison}  = require("../controllers/UserController");
const {getAllOrders,getOrderDetailsForAdmin,  updatePaymentStatus,
    updateRefundStatus, updateOrderStatus, getMonthlyRevenue, getWeeklyRevenue ,getRevenueComparison, getOrderComparison,
    getTopRatedProducts, getTopOrderedProductsController } = require("../controllers/OrderController");
const { loginAdmin} = require("../controllers/AdminController");
const verifyToken = require('../middlewares/verifyToken');
const verifyAdmin = require('../middlewares/verifyAdmin');

const multer = require('multer');
const fs = require('fs')


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const dir = 'uploads/';
        try {
            await fs.promises.mkdir(dir, { recursive: true }); // Create directory if it doesn't exist
            cb(null, dir);
        } catch (err) {
            console.error('Error creating directory:', err);
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

const router = express.Router();

// Route to get monthly revenue (only paid orders)
router.get("/revenue", getMonthlyRevenue);

router.get("/WeeklyRevenue", getWeeklyRevenue );

router.get("/total" , getRevenueComparison);

router.get("/totalOrders", getOrderComparison);

router.get("/totalUsers", getUserComparison);
router.get("/topRatedProducts", getTopRatedProducts);

router.get("/topOrderedProducts", getTopOrderedProductsController);


router.get("/allOrders", getAllOrders);

//products
router.get("/products/all", verifyToken,verifyAdmin ,getAllProducts);
router.post("/products/add",verifyToken, verifyAdmin ,createProduct);
router.put("/products/update/:id" , verifyToken, verifyAdmin ,updateProduct );
router.delete("/products/:product_id" , verifyToken, verifyAdmin,deleteProduct);
router.post("/products/import" ,upload.single('file'),importProducts);
router.post("/login",loginAdmin)


//orders
router.get("/orders/:orderId", getOrderDetailsForAdmin )

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
