const Type = require('../models/Type');

//get all types
exports.getAllTypes = async (req, res) => {
    try {
        const types = await Type.find();
        res.status(200).json({
            status: 'success',
            data: types
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}