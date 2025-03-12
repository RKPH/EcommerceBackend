const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const path = require("path");
const Minio = require("minio");

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// MinIO Client Configuration
const minioClient = new Minio.Client({
    endPoint: "minio.d2f.io.vn",
    port: 9000, // Correct API port
    useSSL: false, // Set to true if using HTTPS
    accessKey: "minioadmin",
    secretKey: "minioadmin",
});

const BUCKET_NAME = "images"; // Your MinIO bucket

// Upload image to both MinIO and Cloudinary
const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        // Generate a unique filename
        const fileName = `${Date.now()}-${req.file.originalname}`;

        // Check if bucket exists, create it if it doesn't
        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        if (!bucketExists) {
            await minioClient.makeBucket(BUCKET_NAME, "us-east-1"); // Adjust region as needed
        }

        // Upload to MinIO
        await minioClient.putObject(BUCKET_NAME, fileName, req.file.buffer, {
            "Content-Type": req.file.mimetype,
        });

        // Generate presigned URL for MinIO (valid for 24 hours)
        const urlMinio = await minioClient.presignedUrl("GET", BUCKET_NAME, fileName, 24 * 60 * 60);

        // Convert image to base64 for Cloudinary
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
            public_id: path.parse(req.file.originalname).name,
            folder: "uploads",
            overwrite: true,
        });

        // Return both URLs
        res.json({
            imageUrl: cloudinaryResult.secure_url, // Cloudinary URL
            urlMinio: urlMinio, // Presigned MinIO URL
        });
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