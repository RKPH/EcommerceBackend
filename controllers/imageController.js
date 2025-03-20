const multer = require("multer");
const { uploadImageToStorage } = require("../Services/imageService");

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Controller to handle image upload
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Use the service to upload the image
        const result = await uploadImageToStorage(req.file);

        // Return the URLs
        res.json({
            imageUrl: result.imageUrl,
            urlMinio: result.urlMinio,
        });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Image upload failed" });
    }
};

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: "Multer error: " + err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

// Export the multer middleware, error handler, and controller function
module.exports = {
    upload,
    handleMulterError,
    uploadImage,
};