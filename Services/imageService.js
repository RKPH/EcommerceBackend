require("dotenv").config();
const cloudinary = require("../config/cloudinary");
const Minio = require("minio");
const path = require("path");

// MinIO Client Configuration
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME;

// Service to handle image uploads to MinIO and Cloudinary
const uploadImageToStorage = async (file) => {
    try {
        if (!file) {
            throw new Error("No file uploaded");
        }

        // Generate a unique filename
        const fileName = `${Date.now()}-${file.originalname}`;

        // Check if bucket exists, create it if it doesn't
        const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
        if (!bucketExists) {
            await minioClient.makeBucket(BUCKET_NAME);
        }

        // Upload to MinIO
        await minioClient.putObject(BUCKET_NAME, fileName, file.buffer, {
            "Content-Type": file.mimetype,
        });

        // Generate presigned URL for MinIO (valid for 24 hours)
        const urlMinio = await minioClient.presignedUrl("GET", BUCKET_NAME, fileName, 24 * 60 * 60);

        // Convert image to base64 for Cloudinary
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

        // Upload to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
            public_id: path.parse(file.originalname).name,
            folder: "uploads",
            overwrite: true,
        });

        // Return both URLs
        return {
            imageUrl: cloudinaryResult.secure_url, // Cloudinary URL
            urlMinio: urlMinio, // Presigned MinIO URL
        };
    } catch (error) {
        console.error("Service upload error:", error);
        throw new Error("Image upload failed");
    }
};

module.exports = {
    uploadImageToStorage,
};