const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const path = require("path");

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload image to Cloudinary
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Convert image to base64 (Cloudinary supports both base64 and streams)
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(base64Image, {
            public_id: path.parse(req.file.originalname).name, // Use filename as public_id
            folder: "uploads", // Optional folder in Cloudinary
            overwrite: true,
        });

        res.json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Image upload failed" });
    }
};

// Export the multer middleware and controller function
module.exports = {
    upload,
    uploadImage,
};
