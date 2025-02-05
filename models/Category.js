const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({  // ✅ Fixed typo here
    name: {
        type: String,
        required: true,
        unique: true
    },
    rawName: {
        type: String,
        required: true
    },
});

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;
