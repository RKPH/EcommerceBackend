const express = require("express");
const router = express.Router();
const {
    addShippingAddress,
    getShippingAddresses,
    updateShippingAddress,
    deleteShippingAddress
} = require("../controllers/AddressController");
const verifyToken = require("../middlewares/verifyToken"); // Ensure user is authenticated

router.post("/add", verifyToken, addShippingAddress);
router.get("/", verifyToken, getShippingAddresses);
router.put("/update", verifyToken, updateShippingAddress);
router.delete("/delete/:addressId", verifyToken, deleteShippingAddress);

module.exports = router;
