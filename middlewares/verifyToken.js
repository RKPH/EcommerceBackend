const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.accessToken;  // Extract token from header
    // console.log("token in verifyToken:", token);
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Replace with your secret key
        req.user = decoded;  // Attach user data to req.user

        next();  // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(404).json({ message: 'Invalid token' });
    }
};

module.exports = verifyToken;
