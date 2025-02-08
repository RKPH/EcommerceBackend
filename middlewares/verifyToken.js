const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    let tokenSource = "";
    let token = "";

    if (req.header('Authorization')) {
        token = req.header('Authorization').replace('Bearer ', '');
        tokenSource = "Authorization Header";
    } else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
        tokenSource = "Cookie";
    }

    console.log("Token in verifyToken:", token);
    console.log("Token Source:", tokenSource);

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Attach user data to req.user
        console.log("Valid JWT token:", token);
        console.log("Decoded User:", decoded);

        next();
    } catch (err) {
        console.log("Invalid JWT token:", token);
        console.log("JWT verify error:", err);
        return res.status(404).json({ message: 'Invalid token' });
    }
};

module.exports = verifyToken;
