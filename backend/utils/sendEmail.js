const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    try {
        // Create a nodemailer transporter with more reliable settings
        let transporter;
        
        // Try OAuth2 method first - this is more reliable with Gmail
        if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'surakshad00@gmail.com',
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN
                }
            });
        } else {
            // Fallback to app password method with updated settings
            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',  // Use explicit host instead of 'service'
                port: 465,               // Use port 465 for SSL
                secure: true,            // Use SSL
                auth: {
                    user: 'surakshad00@gmail.com',
                    pass: 'rnzt bwqo bxqm kmuq'  // App password
                },
                debug: true              // Enable debug output
            });
        }

        // Setup email options
        const mailOptions = {
            from: '"Kheti Bazaar" <surakshad00@gmail.com>',
            to,
            subject,
            text,
            html: text.replace(/\n/g, '<br>'),
            // Add extra headers to improve deliverability
            headers: {
                'Priority': 'normal',
                'X-Mailer': 'Kheti Bazaar Password Reset System'
            }
        };

        // Send email with more detailed logging
        console.log(`Attempting to send email to ${to} with subject: ${subject}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);
        
        // Verify the message was sent and return the result
        if (info && info.messageId) {
            console.log('Message sent successfully with ID:', info.messageId);
            return info;
        } else {
            throw new Error('Email appeared to send but no message ID was returned');
        }
    } catch (error) {
        console.error('Error sending email - Detailed info:', error);
        // Print out stack trace for more debugging info
        console.error(error.stack);
        throw error; // Rethrow to handle in calling function
    }
};

module.exports = sendEmail;