const jwt = require ('jsonwebtoken');
const res = require("express/lib/response");

function generateJwt (userId) {
    const secret = process.env.JWT_SECRET;
    return jwt.sign({userId}, secret, {expiresIn: '1h'});
}

function generateRefreshToken(userId) {
    const secret = process.env.JWT_SECRET;
    return jwt.sign({userId}, secret, {expiresIn: '24h'});
}

function verifyJwt (token) {
    const secret = process.env.JWT_SECRET;
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    }catch(err) {
        return res.status(401).json({message: `Unable to verify JWT ${token}`});
    }
}

function verifyRefreshToken (token) {
    const secret = process.env.JWT_SECRET;
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    }catch(err) {
        return res.status(401).json({message: `Unable to verify JWT ${token}`});
    }
}
module.exports = {generateJwt,verifyJwt, generateRefreshToken, verifyRefreshToken};