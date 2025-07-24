const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Registration route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, newsletter } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const [existingUsers] = await promisePool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
    
    // Generate email verification token
    const emailVerificationToken = jwt.sign(
      { email: email, type: 'email_verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create user
    const query = `
      INSERT INTO users (name, email, password, phone, address, newsletter_subscribed, email_verification_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const [result] = await promisePool.execute(query, [
      name, 
      email, 
      hashedPassword, 
      phone || null, 
      address || null, 
      newsletter ? 1 : 0,
      emailVerificationToken
    ]);

    const user = {
      id: result.insertId,
      name,
      email,
      phone,
      address,
      role: 'customer',
      newsletter_subscribed: newsletter ? 1 : 0
    };

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Update last login
    await promisePool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});
// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    const [rows] = await promisePool.execute(
      'SELECT id, name, email, password, role, is_active FROM users WHERE email = ?', 
      [email]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Update last login time
    await promisePool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Remove password from response
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check email availability
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const [existingUsers] = await promisePool.execute('SELECT id FROM users WHERE email = ?', [email]);
    
    res.json({
      success: true,
      available: existingUsers.length === 0
    });
    
  } catch (error) {
    console.error('Email check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email availability'
    });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      try {
        // Verify and decode token to get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Update last logout time
        await promisePool.execute(
          'UPDATE users SET last_login = NULL WHERE id = ?', 
          [decoded.id]
        );
        
        console.log(`User ${decoded.email} logged out successfully`);
      } catch (error) {
        // Token might be invalid/expired, but still allow logout
        console.log('Logout with invalid/expired token');
      }
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await promisePool.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [decoded.id]);
    
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;
