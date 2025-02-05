const mongoose = require('mongoose'); // ✅ Corrected typo

const SubcategorySchema = new mongoose.Schema({ // ✅ Corrected typo
    name: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId, // ✅ Corrected typo
        ref: 'Category',
        required: true
    },
    rawName: {
        type: String,
        required: true
    },
});

const Subcategory = mongoose.model('Subcategory', SubcategorySchema);

module.exports = Subcategory;
