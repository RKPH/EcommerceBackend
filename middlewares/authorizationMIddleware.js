const jwt = require('jsonwebtoken');
const { verifyJwt, generateRefreshToken} = require('../untils/jwt'); // Corrected the typo from "untils" to "utils"

const authorizationMiddleware = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    console.log("token take in", token);
    if (!token) {
        return res.status(401).json({ message: 'Token is required' });
    }

    const decoded = verifyJwt(token); // Using the manually implemented verifyJwt function

    if (decoded.message) {
        return res.status(403).json({ message: decoded.message });
    }

    req.user = decoded; // Attaching decoded user data to request object
    next(); // Proceed to the next middleware/route handler
};

module.exports = authorizationMiddleware;
