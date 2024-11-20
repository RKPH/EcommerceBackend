const crypto = require('crypto');

function hash(text) {
    const salt = crypto.randomBytes(64).toString('hex');
    const hash = crypto.pbkdf2Sync(text, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

function verifyPassword(storedSalt,storedHashedPassword, password) {
    const hashedPassword= crypto.pbkdf2Sync(password,storedSalt,1000, 64, 'sha512').toString('hex');
    return hashedPassword=== storedHashedPassword;
}

module.exports = {hash, verifyPassword};