const express = require("express");
const { upload, uploadImage } = require("../controllers/imageController");

const router = express.Router();

// Route for uploading image
router.post("/upload", upload.single("file"), uploadImage);

module.exports = router;
