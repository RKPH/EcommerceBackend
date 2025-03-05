const mongoose = require('mongoose');
require('./models/category');
require('./models/subcategory');
require('./models/type');

const Type = mongoose.model('Type');
const Category = mongoose.model('Category');
const Subcategory = mongoose.model('Subcategory');

const migrateData = async () => {
    try {
        await mongoose.connect('mongodb://root:example@103.155.161.94:27017/recommendation_system?authSource=admin');

        console.log("Connected to MongoDB. Starting migration...");

        const types = await Type.find().populate('subCategory');

        for (const type of types) {
            if (type.subCategory) {
                const subcategory = await Subcategory.findById(type.subCategory);

                if (subcategory && subcategory.category) {
                    type.category = subcategory.category.toString(); // ✅ Convert ObjectId to String
                    await type.save();
                    console.log(`Updated Type ${type._id}: Assigned Category ${type.category}`);
                } else {
                    console.warn(`No category found for Subcategory: ${type.subCategory}`);
                }
            }
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.connection.close();
    }
};

migrateData();
