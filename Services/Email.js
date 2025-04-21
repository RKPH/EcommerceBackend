const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { validate } = require('deep-email-validator');

const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    auth: {
        user: 'apikey', // Must be 'apikey'
        pass: process.env.SENDGRID_API_KEY,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 60000, // 1 minute
    rateLimit: 10, // 10 emails per minute
    logger: true, // Enable for debugging
    debug: true, // Enable for detailed logs
});

transporter.verify((error) => {
    if (error) {
        console.error('SendGrid SMTP Connection Error:', error);
    } else {
        console.log('SendGrid SMTP Server is ready to send emails');
    }
});

async function isEmailValid(email) {
    // Configure deep-email-validator to skip the SMTP check
    const result = await validate({
        email,
        validateSMTP: false, // Disable SMTP check
    });
    return result;
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
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Verify Your Account - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Welcome to D2F Ecommerce!</h2>
            <p style="font-size: 16px; color: #555;">To complete your registration, please verify your email address by entering the code below:</p>
            <div style="background: #007bff; color: white; padding: 15px; font-size: 24px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                ${code}
            </div>
            
            <p style="font-size: 14px; color: #777;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
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
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Reset Your Password - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to set a new password:</p>
            
            <a href="${resetLink}" style="background: #007bff; color: white; text-decoration: none; padding: 15px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Reset Password
            </a>

            <p style="font-size: 14px; color: #777;">If you did not request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
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

async function sendCancellationEmail(to, orderId) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }

    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";

    const mailOptions = {
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Order Cancellation - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Order Cancellation</h2>
            <p style="font-size: 16px; color: #555;">Your order is canceled successfully</p>
            
            <div style="background: #ff4d4d; color: white; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Order ID: ${orderId}
            </div>

            <p style="font-size: 14px; color: #777;">If you have any questions or need further assistance, please contact our support team.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
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
                .order-id {
                    font-size: 18px;
                    padding: 12px;
                }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Cancellation email sent to:", to, "Response:", info.response);
    } catch (error) {
        console.error("Error sending cancellation email:", error);
    }
}

async function sendRefundSuccessEmail(to, orderId) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }

    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";

    const mailOptions = {
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Refund Processed Successfully - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Refund Processed Successfully</h2>
            <p style="font-size: 16px; color: #555;">Your refund for the following order has been processed successfully:</p>
            <div style="background: #28a745; color: white; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Order ID: ${orderId}
            </div>
            <p style="font-size: 14px; color: #777;">If you have any questions, please contact our support team.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
        </div>
        <style>
            @media screen and (max-width: 600px) {
                div { padding: 10px; }
                h2 { font-size: 20px; }
                p { font-size: 14px; }
                .order-id { font-size: 18px; padding: 12px; }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Refund success email sent to:", to, "Response:", info.response);
        return true;
    } catch (error) {
        console.error("Error sending refund success email:", error);
        return false;
    }
}

async function sendRefundFailedEmail(to, orderId) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }

    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";

    const mailOptions = {
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Refund Failed - Additional Information Required - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Refund Failed</h2>
            <p style="font-size: 16px; color: #555;">We encountered an issue processing your refund for the following order:</p>
            <div style="background: #dc3545; color: white; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Order ID: ${orderId}
            </div>
            <p style="font-size: 16px; color: #555;">Please provide additional refund information by contacting our support team or replying to this email with:</p>
            <ul style="text-align: left; font-size: 14px; color: #777; margin: 20px 0;">
                <li>Bank Account Name</li>
                <li>Bank Name</li>
                <li>Account Number</li>
            </ul>
            <p style="font-size: 14px; color: #777;">If you have any questions, please reach out to our support team.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
        </div>
        <style>
            @media screen and (max-width: 600px) {
                div { padding: 10px; }
                h2 { font-size: 20px; }
                p { font-size: 14px; }
                .order-id { font-size: 18px; padding: 12px; }
                ul { font-size: 12px; }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Refund failed email sent to:", to, "Response:", info.response);
        return true
    } catch (error) {
        console.error("Error sending refund failed email:", error);
        return false;
    }
}

async function sendRefundRequestEmail(to, orderId, cancellationReason) {
    if (!to) {
        console.error("Error: No recipient email provided!");
        return;
    }

    const logoUrl = "https://res.cloudinary.com/djxxlou5u/image/upload/v1739790344/logo_s1fbxd.png";

    const mailOptions = {
        from: '"D2F Ecommerce" <phamhung20031106@gmail.com>',
        to: to,
        subject: "Refund Request - D2F Ecommerce",
        html: `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; text-align: center; background: #f9f9f9;">
            <img src="${logoUrl}" alt="D2F Ecommerce Logo" style="width: 150px; margin-bottom: 20px; max-width: 100%; height: auto;">
            <h2 style="color: #333;">Refund Request</h2>
            <p style="font-size: 16px; color: #555;">Your order has been cancelled by an admin with the following reason:</p>
            <div style="background: #ff9800; color: white; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin: 20px 0;">
                Order ID: ${orderId}
            </div>
            <p style="font-size: 16px; color: #555; font-style: italic;">Reason: ${cancellationReason || "Not specified"}</p>
            <p style="font-size: 16px; color: #555;">To process your refund, please provide the following details by replying to this email or contacting our support team:</p>
            <ul style="text-align: left; font-size: 14px; color: #777; margin: 20px 0;">
                <li>Bank Account Name</li>
                <li>Bank Name</li>
                <li>Account Number</li>
            </ul>
            <p style="font-size: 14px; color: #777;">If you have any questions, please reach out to our support team.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #aaa;">D2F Ecommerce | All Rights Reserved</p>
        </div>
        <style>
            @media screen and (max-width: 600px) {
                div { padding: 10px; }
                h2 { font-size: 20px; }
                p { font-size: 14px; }
                .order-id { font-size: 18px; padding: 12px; }
                ul { font-size: 12px; }
            }
        </style>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Refund request email sent to:", to, "Response:", info.response);
        return true;
    } catch (error) {
        console.error("Error sending refund request email:", error);
        return false;
    }
}

module.exports = {sendResetPasswordEmail,sendVerificationEmail, sendCancellationEmail, sendRefundSuccessEmail, sendRefundFailedEmail , sendRefundRequestEmail};
