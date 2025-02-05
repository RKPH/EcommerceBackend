const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema({
    raw_type: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
}, {
    versionKey: false,  // Disable the __v field
});

const Type = mongoose.model('Type', typeSchema);

module.exports = Type;