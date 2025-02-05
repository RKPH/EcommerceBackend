const Subcategory = require("../models/Subcategory");

// Create a new subcategory
exports.createSubcategory = async (req, res) => {
    try {
        const { name, category, rawName } = req.body;
        const subcategory = new Subcategory({ name, category, rawName });
        await subcategory.save();
        res.status(201).json(subcategory);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all subcategories
exports.getAllSubcategories = async (req, res) => {
    try {
        const subcategories = await Subcategory.find().populate("category");
        res.status(200).json(subcategories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get a single subcategory by ID
exports.getSubcategoryById = async (req, res) => {
    try {
        const subcategory = await Subcategory.findById(req.params.id).populate("category");
        if (!subcategory) return res.status(404).json({ message: "Subcategory not found" });
        res.status(200).json(subcategory);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a subcategory
exports.updateSubcategory = async (req, res) => {
    try {
        const { name, category, rawName } = req.body;
        const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, { name, category, rawName }, { new: true });
        if (!subcategory) return res.status(404).json({ message: "Subcategory not found" });
        res.status(200).json(subcategory);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a subcategory
exports.deleteSubcategory = async (req, res) => {
    try {
        const subcategory = await Subcategory.findByIdAndDelete(req.params.id);
        if (!subcategory) return res.status(404).json({ message: "Subcategory not found" });
        res.status(200).json({ message: "Subcategory deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
