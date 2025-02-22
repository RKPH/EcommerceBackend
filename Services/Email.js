const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { validate } = require('deep-email-validator');
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "pnghung2003@gmail.com", // Your Gmail
        pass: "tsmk mllu nanq bokd", // Your app password
    },
});

async function isEmailValid(email) {
    return validate(email);
}

async function sendVerificationEmail(to, code) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }
    console.log("mail", to);
    const { valid, reason } = await isEmailValid(to);

    if (!valid) {
        console.error(`Invalid email address: ${to}. Reason: ${reason}`);
        return false;  // Return false to indicate failure
    }

    // Use an externally hosted image (replace with the actual URL of your hosted image)
    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";  // Replace with your image URL

    const mailOptions = {
        from: '"Sport Ecommerce" <pnghung2003@gmail.com>',
        to: to,
        subject: "Verify Your Account - Sport Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="Sport Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Welcome to Sport Ecommerce!</h2>
            <p style="font-size: 16px; color: #555;">To complete your registration, please verify your email address by entering the code below:</p>
            <div style="background: #007bff; color: white; padding: 15px; font-size: 24px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                ${code}
            </div>
            
            <p style="font-size: 14px; color: #777;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">Sport Ecommerce | All Rights Reserved</p>
        </div>

        <style>
            /* Mobile styles */
            @media screen and (max-width: 600px) {
                div {
                    padding: 10px;
                }
                h2 {
                    font-size: 20px;
                }
                p {
                    font-size: 14px;
                }
                .verification-code {
                    font-size: 20px;
                    padding: 12px;
                }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Verification email sent to:", to, "Response:", info.response);
        return true;  // ✅ Add this line to return true on success
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}


async function sendResetPasswordEmail(to, resetLink) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }


    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";  // Replace with your image URL

    const mailOptions = {
        from: '"Sport Ecommerce" <pnghung2003@gmail.com>',
        to: to,
        subject: "Reset Your Password - Sport Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="Sport Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to set a new password:</p>
            
            <a href="${resetLink}" style="background: #007bff; color: white; text-decoration: none; padding: 15px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Reset Password
            </a>

            <p style="font-size: 14px; color: #777;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">Sport Ecommerce | All Rights Reserved</p>
        </div>

        <style>
            @media screen and (max-width: 600px) {
                div {
                    padding: 10px;
                }
                h2 {
                    font-size: 20px;
                }
                p {
                    font-size: 14px;
                }
                a {
                    font-size: 16px;
                    padding: 12px;
                }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Reset password email sent to:", to, "Response:", info.response);
    } catch (error) {
        console.error("Error sending reset password email:", error);
    }
}

module.exports = {sendResetPasswordEmail,sendVerificationEmail};
