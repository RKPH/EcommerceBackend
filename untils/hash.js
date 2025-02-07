const crypto = require('crypto');

// Function to hash the password with a salt
function hash(password) {
    const salt = crypto.randomBytes(64).toString('hex'); // Generate a salt
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex'); // Hash the password
    return { salt, hashedPassword }; // Return both salt and hashed password
}

// Function to verify if the entered password matches the stored hashed password
function verifyPassword(storedSalt, storedHashedPassword, password) {
    // Hash the entered password using the stored salt
    const hashedPassword = crypto.pbkdf2Sync(password, storedSalt, 1000, 64, 'sha512').toString('hex');
    return hashedPassword === storedHashedPassword; // Compare the hashed entered password with the stored one
}

module.exports = { hash, verifyPassword };
