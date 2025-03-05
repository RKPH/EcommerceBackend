const express = require("express");
const { getMonthlyRevenue, getProductTypeSales, getMostProductBuyEachType, getRevenueComparison, getOrderComparison,
    getTopRatedProducts
} = require("../controllers/AdminController");
const {getAllOrders, updateProduct, loginAdmin} = require("../controllers/AdminController");

const router = express.Router();

// Route to get monthly revenue (only paid orders)
router.get("/revenue", getMonthlyRevenue);

router.get("/total" , getRevenueComparison);

router.get("/totalOrders", getOrderComparison);

router.get("/topRatedProducts", getTopRatedProducts);
// Route to get total sales for each product type
router.get("/product-type-sales", getProductTypeSales);

// Route to get the most bought product in each type
router.get("/most-bought-product-type", getMostProductBuyEachType);

router.get("/allOrders", getAllOrders);

router.put("/products/update/:id" , updateProduct );

router.post("/login", loginAdmin)

module.exports = router;
