const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const mysql = require('mysql2');
const crypto = require('crypto');
// Use your custom sendEmail utility instead of nodemailer directly
const sendEmail = require('../utils/sendEmail');

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'q1w2##22',
    database: 'farmers_market'
});

// Login route
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    
    const tableName = 'farmers';
    const roleFilter = role === 'farmer' ? 'farmer' : 'buyer';
    
    db.query(`SELECT * FROM ${tableName} WHERE username = ? AND role = ?`, [username, roleFilter], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials or user not found' });
        }
        
        const user = results[0];
        
        try {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid password' });
            }
            
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role }, 
                process.env.JWT_SECRET || 'your_jwt_secret', 
                { expiresIn: '24h' }
            );
            
            res.cookie('jwt', token, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
            
            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Server error: ' + error.message });
        }
    });
});

// Signup route
router.post('/signup', async (req, res) => {
    const { username, email, phone, password, role } = req.body;
    
    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'Username, email, password, and role are required' });
    }
    
    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert user into farmers table
        const query = `
            INSERT INTO farmers (username, email, phone, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.query(query, [username, email, phone, hashedPassword, role], (err, result) => {
            if (err) {
                console.error('Error creating user:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: result.insertId,
                    username,
                    role
                }
            });
        });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Logout route
router.post('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.json({ message: 'Logout successful' });
});

// Forgot password route - UPDATED & FIXED
router.post('/forgot-password', async (req, res) => {
    const { email, isFarmer } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    const role = isFarmer ? 'farmer' : 'buyer';
    
    try {
        // Find user by email
        db.query('SELECT * FROM farmers WHERE email = ? AND role = ?', [email, role], async (err, results) => {
            if (err) {
                console.error('Error querying user:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            // Even if user not found, don't reveal this for security reasons
            if (results.length === 0) {
                console.log(`No user found with email ${email} and role ${role}`);
                // Still return success message for security
                return res.status(200).json({ message: 'If that email exists in our system, a reset code has been sent.' });
            }
            
            const user = results[0];
            console.log(`User found: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
            
            // Generate a 6-digit reset code
            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`Generated reset code: ${resetCode}`);
            
            // Set expiry time to 1 hour from now
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 1);
            
            // Delete any existing reset tokens for this user
            db.query('DELETE FROM reset_tokens WHERE user_id = ? AND user_type = ?', [user.id, role], (deleteErr) => {
                if (deleteErr) {
                    console.error('Error deleting existing tokens:', deleteErr);
                    // Continue anyway, not critical
                }
                
                console.log(`Deleted old reset tokens for user ID ${user.id}`);
                
                // Store the reset token in the database
                db.query(
                    'INSERT INTO reset_tokens (user_id, user_type, token, expires_at) VALUES (?, ?, ?, ?)',
                    [user.id, role, resetCode, expiryDate],
                    async (insertErr) => {
                        if (insertErr) {
                            console.error('Error storing reset token:', insertErr);
                            return res.status(500).json({ error: 'Database error: ' + insertErr.message });
                        }
                        
                        console.log(`Reset token stored in database for user ID ${user.id}`);
                        
                        // Create reset URL with base URL from request
                        const baseUrl = `${req.protocol}://${req.get('host')}`;
                        const resetUrl = `${baseUrl}/reset-password.html?token=${resetCode}&email=${encodeURIComponent(email)}&type=${role}`;
                        
                        console.log(`Reset URL generated: ${resetUrl}`);
                        
                        // Email content with both plain text and HTML formatting
                        const subject = 'Password Reset - Kheti Bazaar';
                        const emailBody = `
                            Password Reset for Kheti Bazaar

                            You requested a password reset for your Kheti Bazaar account.
                            
                            Your reset code is: ${resetCode}
                            
                            Please use this code to reset your password. This code will expire in 1 hour.
                            
                            If you did not request this, please ignore this email.
                            
                            To reset your password, visit:
                            ${resetUrl}
                        `;
                        
                        try {
                            console.log(`Attempting to send email to ${email}`);
                            // Use sendEmail utility
                            await sendEmail(email, subject, emailBody);
                            
                            console.log(`Reset email sent successfully to ${email}`);
                            return res.json({ message: 'Reset code has been sent to your email.' });
                        } catch (emailError) {
                            console.error('Failed to send reset email:', emailError);
                            
                            // Try to provide more specific error information
                            let errorMessage = 'Failed to send reset email. Please try again later.';
                            if (emailError.message) {
                                console.error('Email error details:', emailError.message);
                                
                                if (emailError.message.includes('authentication')) {
                                    errorMessage = 'Email authentication failed. Please contact support.';
                                } else if (emailError.message.includes('connect')) {
                                    errorMessage = 'Connection to email server failed. Please try again later.';
                                }
                            }
                            
                            return res.status(500).json({ error: errorMessage });
                        }
                    }
                );
            });
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Verify reset token route
router.post('/verify-reset-token', (req, res) => {
    const { email, token, type } = req.body;
    
    if (!email || !token || !type) {
        return res.status(400).json({ error: 'Email, token, and type are required' });
    }
    
    // First get the user ID
    db.query('SELECT id FROM farmers WHERE email = ? AND role = ?', [email, type], (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid email or user type' });
        }
        
        const userId = results[0].id;
        
        // Then verify the token
        db.query(
            'SELECT * FROM reset_tokens WHERE user_id = ? AND user_type = ? AND token = ? AND expires_at > NOW()',
            [userId, type, token],
            (err, results) => {
                if (err) {
                    console.error('Error verifying token:', err);
                    return res.status(500).json({ error: 'Database error: ' + err.message });
                }
                
                if (results.length === 0) {
                    return res.status(400).json({ error: 'Invalid or expired reset token' });
                }
                
                res.json({ valid: true });
            }
        );
    });
});

// Reset password route
router.post('/reset-password', async (req, res) => {
    const { email, token, password, type } = req.body;
    
    if (!email || !token || !password || !type) {
        return res.status(400).json({ error: 'Email, token, password, and type are required' });
    }
    
    try {
        // First get the user ID
        db.query('SELECT id FROM farmers WHERE email = ? AND role = ?', [email, type], async (err, results) => {
            if (err) {
                console.error('Error querying user:', err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }
            
            if (results.length === 0) {
                return res.status(400).json({ error: 'Invalid email or user type' });
            }
            
            const userId = results[0].id;
            
            // Verify the token
            db.query(
                'SELECT * FROM reset_tokens WHERE user_id = ? AND user_type = ? AND token = ? AND expires_at > NOW()',
                [userId, type, token],
                async (err, results) => {
                    if (err) {
                        console.error('Error verifying token:', err);
                        return res.status(500).json({ error: 'Database error: ' + err.message });
                    }
                    
                    if (results.length === 0) {
                        return res.status(400).json({ error: 'Invalid or expired reset token' });
                    }
                    
                    // Hash the new password
                    const salt = await bcrypt.genSalt(10);
                    const hashedPassword = await bcrypt.hash(password, salt);
                    
                    // Update the user's password
                    db.query(
                        'UPDATE farmers SET password_hash = ? WHERE id = ?',
                        [hashedPassword, userId],
                        (err) => {
                            if (err) {
                                console.error('Error updating password:', err);
                                return res.status(500).json({ error: 'Database error: ' + err.message });
                            }
                            
                            // Delete the used token
                            db.query('DELETE FROM reset_tokens WHERE user_id = ? AND user_type = ?', [userId, type]);
                            
                            res.json({ message: 'Password reset successful' });
                        }
                    );
                }
            );
        });
    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

module.exports = router;