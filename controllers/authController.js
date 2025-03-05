    const User = require('../models/user');
    const Cart = require('../models/cart');
    const crypto = require('crypto');
    const jwt = require ('jsonwebtoken');
    const { hash, verifyPassword } = require('../utils/hash');  // Import password utility
    const { generateJwt, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');  // Import JWT generation utility
    const { v4: uuidv4 } = require('uuid');
    const {sendVerificationEmail, sendResetPasswordEmail} = require("../Services/Email");

    // @desc    Register a new user
    // @route   POST /api/v1/auth/register
    // @access  Public

    exports.registerUser = async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // Check if the user already exists
            let user = await User.findOne({ email });
            if (user) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Generate a unique user_id
            let user_id;
            let isUnique = false;

            while (!isUnique) {
                user_id = Math.floor(Math.random() * (10000000 - 10000) + 10000); // Generate a random number in the range
                const existingUser = await User.findOne({ user_id }); // Check if it already exists
                if (!existingUser) {
                    isUnique = true; // Break loop if the ID is unique
                }
            }

            // Hash the password and generate the salt
            const { salt, hashedPassword } = await hash(password);

            // Create the new user object but do not save it yet
            user = new User({
                name,
                email,
                user_id,
                password: hashedPassword, // Store the hashed password
                salt, // Store the salt
                isVerified: false,
                verificationCode: crypto.randomInt(100000000000, 999999999999),
            });

            // Attempt to send the verification email
            const emailSent = await sendVerificationEmail(user.email, user.verificationCode);
            console.log("emailSent", emailSent);
            if (!emailSent) {
                return res.status(400).json({ message: "Invalid email address or failed to send verification email" });
            }


            // Save the user to the database only if the email was sent successfully
            await user.save();

            // Generate a JWT token
            const sessionID = uuidv4(); // Generate a unique session ID
            const token = generateJwt(user._id, sessionID);
            const refreshToken = generateRefreshToken(user._id, sessionID);

            // Set cookies
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
                sameSite: 'Strict', // or 'Lax' depending on your needs
                maxAge: 24 * 60 * 60 * 1000, // 1 day
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
                sameSite: 'Strict', // or 'Lax'
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            });

            // Respond with success
            res.status(201).json({
                message: 'User registered successfully',
                token,
                refreshToken,
                user: {
                    id: user._id,
                    user_id: user.user_id,
                    sessionID: sessionID,
                    avatar: user.avatar,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error('Registration error:', error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };


    // @desc    Login a user
    // @route   POST /api/v1/auth/login
    // @access  Public
    exports.loginUser = async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validate required fields
            if (!email || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if the user exists
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or pass word' });
            }
            if (!user.isVerified) {
                return res.status(403).json({ message: 'Account not verified. Please check your email to verify your account.' });
            }

            // Verify the password
            const isPasswordValid = verifyPassword(user.salt, user.password, password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate a JWT token

            const sessionID = uuidv4();
            const token = generateJwt(user._id,sessionID);

            const refreshToken = generateRefreshToken(user._id, sessionID);
            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',  // Set to true if you're using HTTPS
                sameSite: 'Strict',  // or 'Lax' depending on your needs
                maxAge: 24 * 60 * 60 * 1000,  // 1 day
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if you're using HTTPS
                sameSite: 'Strict',  // or 'Lax'
                maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
            });
            // Send response
            res.status(200).json({
                message: 'Login successful',

                token,
                refreshToken,
                user: {
                    id: user._id,
                    sessionID: sessionID,
                    user_id: user.user_id,
                    avatar: user.avatar,
                    name: user.name,
                    email: user.email,
                    role:user.role,
                },

            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };


    exports.verifyUser = async (req, res) => {
        try {
           const {userId} = req.user;
            const {verificationCode} = req.body;
            console.log(verificationCode, typeof( verificationCode));
            // Find user by email
            const user = await User.findById(userId);

            if (!user) {
                return res.status(400).json({ message: "User not found" });
            }

            // Check if the code matches
            if (user.verificationCode !== verificationCode) {
                return res.status(400).json({ message: "Invalid verification code" });
            }
            const sessionID = uuidv4();
            // Mark user as verified
            user.isVerified = true;
            user.verificationCode = null; // Remove the code after verification
            await user.save();

            res.status(200).json({
                message: 'User verify successfully',
                user: {
                    id: user._id,
                    user_id: user.user_id,
                    sessionID: sessionID,
                    avatar: user.avatar,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: "Server error" });
        }
    };

    exports.forgotPassword = async (req, res) => {
        try {
            const { email } = req.body;

            // Check if the user exists
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Generate a reset token (JWT)
            const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });

            // Save token in DB
            user.resetToken = resetToken;
            user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins expiry
            await user.save();

            // Create reset link
            const resetLink = `http://103.155.161.94:5173/reset-password/${resetToken}`;

            // Send reset email
            await sendResetPasswordEmail(user.email,resetLink);

            res.json({ message: "Password reset email sent!" });

        } catch (error) {
            console.error("Forgot Password Error:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    };
    // 🟢 Step 3: Reset Password
    exports.resetPassword = async (req, res) => {

        const {token, password } = req.body;
        console.log("token: ",token);
        try {
            const user = await User.findOne({ resetToken: token });
            console.log("user", user);
            if (!user || user.resetTokenExpiry < Date.now()) {
                return res.status(400).json({ message: "Invalid or expired token" });
            }

            const { salt, hashedPassword } = await hash(password);
            user.password = hashedPassword;
            user.salt = salt;
            user.resetToken = undefined;

            user.resetTokenExpiry = undefined;
            await user.save();

            res.json({ message: "Password reset successful" });

        } catch (error) {
            res.status(500).json({ message: "Password reset failed", error });
        }
    };

    // @desc    Get user profile
    // @route   GET /api/v1/auth/profile
    // @access  Private (Protected by token)
    // @desc    Get user profile
    // @route   GET /api/v1/auth/profile
    // @access  Private (Protected by token)
    exports.getUserProfile = async (req, res) => {
        try {
            console.log('User from token:', req.user);  // Log the user data from the token
            const { userId, sessionID,LoggedinSession } = req.user;  // Destructure from req.user
            // console.log("user at get profile", req.user);
            const user = await User.findById(userId);
            const cart = await Cart.countDocuments({ user: user._id });
            if (!user) {
                console.log("User not found");
                return res.status(401).json({ message: 'User not found' });
            }

            res.status(200).json({
                message: 'User profile fetched successfully',


                user: {
                    id: user._id,
                    sessionID: sessionID,
                    name: user.name,
                    avatar: user.avatar,
                    user_id: user.user_id,
                    email: user.email,
                    Cart: cart,
                    role:user.role,
                },
            });
        } catch (error) {
            console.error('Error fetching user profile:', error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };

    // @desc    Refresh access token using refresh token
    // @route   POST /api/v1/auth/refresh-token
    // @access  Private (Requires valid refresh token)
    exports.refreshAccessToken = async (req, res) => {
        let tokenSource = "";
        let token = "";

        if (req.header('Authorization')) {
            token = req.header('Authorization').replace('Bearer ', '');
            tokenSource = "Authorization Header";
        } else if (req.cookies?.refreshToken) {
            token = req.cookies.refreshToken;
            tokenSource = "Cookie";
        }
        console.log("tokenSource", tokenSource);
        try {


            // Check if the refresh token is present
            if (!token) {
                return res.status(401).json({ message: 'No refresh token provided' });
            }

            // Verify the refresh token
            const decoded = verifyRefreshToken(token);  // Ensure this is a valid decoded payload
            if (!decoded) {
                return res.status(401).json({ message: 'Invalid or expired refresh token' });
            }

            // Generate new tokens using the decoded user ID
            const accessToken = generateJwt(decoded.userId.toString(), decoded.sessionID.toString());
            const newRefreshToken = generateRefreshToken(decoded.userId.toString(), decoded.sessionID.toString());

            // Set new cookies for access and refresh tokens
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 24 * 60 * 60 * 1000,  // 1 day
            });
            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
            });

            // Respond with the new access and refresh tokens
            res.status(200).json({
                message: 'New access token generated successfully',
                token: accessToken,
                refreshToken: newRefreshToken
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({ message: 'Server error' });
        }
    };

    // @desc    Logout user
    // @route   POST /api/v1/auth/logout
    // @access  Private
    exports.logoutUser = async (req, res) => {
        try {
            // Clear authentication cookies
            res.clearCookie('accessToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use true in production for HTTPS
                sameSite: 'Strict',
            });

            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use true in production for HTTPS
                sameSite: 'Strict',
            });

            // Optionally, log out the action or handle token invalidation if stored in DB
            console.log('User logged out and cookies cleared.');

            res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Error during logout:', error.message);
            res.status(500).json({ message: 'Server error during logout' });
        }
    };




