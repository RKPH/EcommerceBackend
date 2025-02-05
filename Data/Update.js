const mongoose = require("mongoose");
const axios = require("axios");
const Product = require("../models/products");

// MongoDB connection
const mongoURI = "mongodb://mongodb-service:27017/ecommerce";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Error connecting to MongoDB:", err));

// Google Custom Search API details
const GOOGLE_API_KEY = "AIzaSyBuXJKN6j2gRbicG76-vAbBf2-Jq-52vuQ"; // Replace with your API Key
const SEARCH_ENGINE_ID = "6584ac170d45a4cfe"; // Replace with your Search Engine ID

// Function to search for images on Google
const searchGoogleImages = async (query, numResults = 10) => {
    try {
        const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
            params: {
                key: GOOGLE_API_KEY,
                cx: SEARCH_ENGINE_ID,
                searchType: "image",
                q: query,
                num: numResults,
                safe: "off"
            }
        });

        return response.data.items.map(item => item.link);
    } catch (error) {
        console.error("Error fetching images from Google:", error);
        return [];
    }
};

// Function to shuffle an array
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
};

// Function to update product images
const updateImageColumns = async () => {
    const type = "kettle"; // Example: TV
    const brand = "scarlett"; // Example: LG

    try {
        // Find all products where type = "tv" and brand = "lg"
        const products = await Product.find({ type, brand });

        if (products.length === 0) {
            console.log(`No products found for type "${type}" and brand "${brand}".`);
            return;
        }

        // Fetch 20 images in a single API call
        const query = `${brand} ${type}`;
        let imageResults = await searchGoogleImages(query, 10);

        if (imageResults.length < 6) {
            console.warn(`Not enough images found for "${query}". Found ${imageResults.length}.`);
            return;
        }

        // Shuffle images to ensure randomness
        shuffleArray(imageResults);

        // Split into two sections
        const firstHalf = imageResults.slice(0, Math.ceil(imageResults.length / 2));

        let updatedCount = 0;

        for (const product of products) {
            if (!Array.isArray(product.color) || product.color.length === 0) {
                console.warn(`Skipping product ${product._id} - No colors defined.`);
                continue;
            }

            // Ensure enough images are available for `image`
            if (imageResults.length < product.color.length) {
                console.warn(`Not enough images for product ${product._id}. Found ${imageResults.length}, expected ${product.color.length}. Skipping.`);
                continue;
            }

            // Select images for `productImage` (3 random images from first half)
            shuffleArray(firstHalf);
            const updatedProductImageArray = firstHalf.slice(0, 3);

            // Select images for `image` (same count as colors, randomly)
            shuffleArray(imageResults);
            const updatedImageArray = imageResults.slice(0, product.color.length);

            // Update product in the database
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
        console.error("Error updating image columns:", error);
    } finally {
        mongoose.connection.close();
    }
};

// Start the update process
updateImageColumns();


// const mongoose = require("mongoose");
// const axios = require("axios");
// const Product = require("../models/products");
//
// // MongoDB connection
// const mongoURI = "mongodb://mongodb-service:27017/ecommerce";
// mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
//     .then(() => console.log("Connected to MongoDB"))
//     .catch((err) => console.error("Error connecting to MongoDB:", err));
//
// // Unsplash API Access Key
// const UNSPLASH_ACCESS_KEY = "ncFvDaVwDVEA5xWMMKEe2Aezqxq1FmOqtHdTR2_HDYo";
//
// // Function to fetch up to 10 random images from Unsplash
// const fetchUnsplashImages = async (query, numResults = 10) => {
//     try {
//         const response = await axios.get("https://api.unsplash.com/search/photos", {
//             params: {
//                 client_id: UNSPLASH_ACCESS_KEY,
//                 query: query,
//                 per_page: numResults
//             }
//         });
//
//         return response.data.results.map(item => item.urls.regular);
//     } catch (error) {
//         console.error(`Error fetching images for ${query}:`, error);
//         return [];
//     }
// };
//
// // Function to shuffle an array
// const shuffleArray = (array) => {
//     for (let i = array.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [array[i], array[j]] = [array[j], array[i]]; // Swap elements
//     }
// };
//
// // Function to update product images
// const updateImageColumns = async () => {
//     const type = "vacuum"; // Type of product to search for
//     const brand = "bosch"; // Brand of the product to filter by
//
//     try {
//         // Get products filtered by both type and brand
//         const products = await Product.find({ type, brand });
//
//         if (products.length === 0) {
//             console.log(`No products found for type "${type}" and brand "${brand}".`);
//             return;
//         }
//
//         let updatedCount = 0;
//
//         // Fetch 10 images in a single API call, using type and brand in the search
//         let imageResults = await fetchUnsplashImages(`${type}`, 30);
//
//         if (imageResults.length === 0) {
//             console.warn("No images fetched. Skipping update.");
//             return;
//         }
//
//         // Shuffle images to ensure randomness
//         shuffleArray(imageResults);
//
//         for (const product of products) {
//             if (!Array.isArray(product.color) || product.color.length === 0) {
//                 console.warn(`Skipping product ${product._id} - No colors defined.`);
//                 continue;
//             }
//
//             // Ensure enough images are available
//             if (imageResults.length < product.color.length) {
//                 console.warn(`Not enough images for product ${product._id}. Found ${imageResults.length}, expected ${product.color.length}. Skipping.`);
//                 continue;
//             }
//
//             // Select images for `productImage` (3 random images from first half)
//             const firstHalf = imageResults.slice(0, Math.ceil(imageResults.length / 2));
//             shuffleArray(firstHalf);
//             const updatedProductImageArray = firstHalf.slice(0, 3);
//
//             // Select images for `image` (same count as colors, randomly)
//             shuffleArray(imageResults);
//             const updatedImageArray = imageResults.slice(0, product.color.length);
//
//             // Update product
//             const updatedProduct = await Product.updateOne(
//                 { _id: product._id },
//                 {
//                     $set: {
//                         image: updatedImageArray,
//                         productImage: updatedProductImageArray
//                     }
//                 }
//             );
//
//             if (updatedProduct.modifiedCount > 0) {
//                 updatedCount++;
//             }
//         }
//
//         console.log(`Successfully updated ${updatedCount} products of type "${type}" and brand "${brand}".`);
//     } catch (error) {
//         console.error("Error updating image columns:", error);
//     } finally {
//         mongoose.connection.close();
//     }
// };
//
// // Run the function
// updateImageColumns();
