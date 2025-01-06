const mongoose = require('mongoose');
const Product = require('../models/products');

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/EcommerceDB';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// URLs for the images
const productImageURLs = [
    "https://m.media-amazon.com/images/I/71Lm6fXhxaL._AC_UF894,1000_QL80_.jpg",
    "https://i.ytimg.com/vi/F04gCvj2Hu0/maxresdefault.jpg",
    "https://i.ytimg.com/vi/iYXq-cxhnvA/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAYh_OVmpP6N95Rc01VBDym2vLlZw",
    "https://cdn.thewirecutter.com/wp-content/media/2022/06/dolls-2048px-8726-3x2-1.jpg?auto=webp&quality=75&crop=3:2&width=1024"
];

const imageURLs = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxvRWV1sOnNnas0rD1L6Xj-_dF9mOdDul2Ow&s",
    "https://i5.walmartimages.com/seo/Simba-Toys-Steffi-Love-Fashion-Deluxe-Playset_41452313-79e6-4fea-b17b-b476a8780a68_1.98f1da8356c7288bee5a2d049df0b374.jpeg",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7sBQ0hK-NUtWn6rsjUWZm5RrwOIIhz9WBHA&s",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-K9uCWEMbRwKs8twfNupGdXdYsNm-uthPyA&s"
];

// Function to randomly pick an image
const getRandomImage = (urlList) => urlList[Math.floor(Math.random() * urlList.length)];

// Function to update the image and productImage columns
const updateImageColumns = async () => {
    try {
        // Find all products where type = "doll"
        const products = await Product.find({ type: "dolls" });

        let updatedCount = 0;

        for (const product of products) {
            const numImages = product.image.length;

            // Generate arrays with the same length
            const updatedImageArray = Array(numImages)
                .fill(null)
                .map(() => getRandomImage(imageURLs));

            const updatedProductImageArray = Array(numImages)
                .fill(null)
                .map(() => getRandomImage(productImageURLs));

            // Randomly replace one item in `image` with an `Image[0]` URL
            updatedImageArray[0] = getRandomImage(imageURLs);

            // Update the product document
            const updatedProduct = await Product.updateOne(
                { _id: product._id },
                {
                    $set: {
                        image: updatedImageArray,
                        productImage: updatedProductImageArray
                    }
                }
            );

            if (updatedProduct.modifiedCount > 0) {
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} products of type "doll".`);
    } catch (error) {
        console.error('Error updating image columns:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Start the update process
updateImageColumns();
