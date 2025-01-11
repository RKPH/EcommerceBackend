const mongoose = require('mongoose');
const Product = require('../models/products');

// MongoDB connection URI
const mongoURI = 'mongodb://mongodb-service:27017/ecommerce';

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

const productImageURLs = [
    "https://cdn.tgdd.vn/Products/Images/42/220522/samsung-galaxy-note-20-ultra-vangdong-600x600-600x600.jpg",
    "https://sonpixel.vn/wp-content/uploads/2024/03/Note-20-Ultra-5G-New.webp",
    "https://m.media-amazon.com/images/I/61QNWgHXuiL._AC_UF1000,1000_QL80_.jpg",
    "https://angkormeas.com/wp-content/uploads/2024/07/used_note20ultra_v5.jpg"
];

const imageURLs = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNJKVweli8wAJsO1nNivmUX-hWRsjkL4AbUbYht-O1TZVrFFD8SBxK6OguKgTajkDv3NU&usqp=CAU",
    "https://cdn.new-brz.net/app/public/models/SM-N980FZGGSEK/large/w/210428160017102656.webp",
    "https://http2.mlstatic.com/D_NQ_NP_919297-MLA43642739222_102020-O.webp",
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC9_a6_00BU2gMl6flw8tbQgUorGA4j5hxTbgIdaarO_acX4LaQbwXrh7xOdwlgszLE0o&usqp=CAU"
];

// Function to randomly pick an image
const getRandomImage = (urlList) => urlList[Math.floor(Math.random() * urlList.length)];

// Function to update the image and productImage columns
const updateImageColumns = async () => {
    const type = "smartphone";
    const brand = "samsung";

    try {
        // Find all products where type = "toys" and brand = "rastar"
        const products = await Product.find({ type, brand });

        if (products.length === 0) {
            console.log(`No products found for type "${type}" and brand "${brand}".`);
            return;
        }

        let updatedCount = 0;

        for (const product of products) {
            const numImages = product.image.length;

            // Generate updated image arrays
            const updatedImageArray = Array.from({ length: numImages }, () => getRandomImage(imageURLs));
            const updatedProductImageArray = Array.from({ length: numImages }, () => getRandomImage(productImageURLs));

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

        console.log(`Successfully updated ${updatedCount} products of type "${type}" and brand "${brand}".`);
    } catch (error) {
        console.error('Error updating image columns:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Start the update process
updateImageColumns();
