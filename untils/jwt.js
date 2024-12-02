const jwt = require ('jsonwebtoken');
const res = require("express/lib/response");

function generateJwt(userId, sessionID) {
    console.log("userId in generateJwt:", userId);
    const secret = process.env.JWT_SECRET;
    return jwt.sign({ userId: userId.toString(), sessionID }, secret, { expiresIn: '1m' });
}

function generateRefreshToken(userId, sessionID) {
    const secret = process.env.JWT_SECRET;
    return jwt.sign({ userId: userId.toString(), sessionID }, secret, { expiresIn: '24h' });
}


function verifyJwt (token) {
    const secret = process.env.JWT_SECRET;
    try {
        const decoded = jwt.verify(token, secret);
        console.log("decoded in verifyJwt:", decoded);
        return decoded;
    }catch(err) {
        return res.status(401).json({message: `Unable to verify JWT ${token}`});
    }
}

function verifyRefreshToken (token) {
    const secret = process.env.JWT_SECRET;
    try {
        const decoded = jwt.verify(token, secret);
        console.log("decoded in verifyRefreshToken:", decoded);
        return decoded;
    }catch(err) {
        return res.status(401).json({message: `Unable to verify JWT ${token}`});
    }
}
module.exports = {generateJwt,verifyJwt, generateRefreshToken, verifyRefreshToken};