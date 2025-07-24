// User Management API Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');
require('dotenv').config();

// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// User Registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, address, password, newsletter } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if user already exists
        const checkUserQuery = 'SELECT id FROM users WHERE email = ?';
        db.query(checkUserQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error occurred'
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertUserQuery = `
                INSERT INTO users (name, email, phone, address, password, role, is_active, newsletter_subscribed, created_at)
                VALUES (?, ?, ?, ?, ?, 'user', true, ?, NOW())
            `;

            db.query(insertUserQuery, [name, email, phone, address, hashedPassword, newsletter || false], (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error creating user account'
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { 
                        id: result.insertId, 
                        email: email, 
                        role: 'user' 
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    token: token,
                    user: {
                        id: result.insertId,
                        name: name,
                        email: email,
                        role: 'user'
                    }
                });
            });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// User Login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const getUserQuery = 'SELECT * FROM users WHERE email = ?';
        db.query(getUserQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error occurred'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = results[0];

            // Check if user is active
            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Account has been deactivated'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Update last login
            const updateLastLoginQuery = 'UPDATE users SET last_login = NOW() WHERE id = ?';
            db.query(updateLastLoginQuery, [user.id]);

            res.json({
                success: true,
                message: 'Login successful',
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin Login
router.post('/admin-login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find admin by email
        const getAdminQuery = 'SELECT * FROM users WHERE email = ? AND role = "admin"';
        db.query(getAdminQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error occurred'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
            }

            const admin = results[0];

            // Check if admin is active
            if (!admin.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin account has been deactivated'
                });
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, admin.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid admin credentials'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: admin.id, 
                    email: admin.email, 
                    role: admin.role 
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Update last login
            const updateLastLoginQuery = 'UPDATE users SET last_login = NOW() WHERE id = ?';
            db.query(updateLastLoginQuery, [admin.id]);

            res.json({
                success: true,
                message: 'Admin login successful',
                token: token,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role
                }
            });
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Check Email Availability
router.post('/check-email', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    const checkEmailQuery = 'SELECT id FROM users WHERE email = ?';
    db.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error occurred'
            });
        }

        res.json({
            success: true,
            available: results.length === 0
        });
    });
});

// Get User Statistics (Admin Only)
router.get('/statistics', authenticateToken, requireAdmin, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
        FROM users
    `;

    db.query(statsQuery, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching user statistics'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
});

// Get All Users (Admin Only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
    const getUsersQuery = `
        SELECT id, name, email, phone, address, role, is_active, created_at, last_login
        FROM users
        ORDER BY created_at DESC
    `;

    db.query(getUsersQuery, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching users'
            });
        }

        res.json({
            success: true,
            data: results
        });
    });
});

// Get Single User (Admin Only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;

    const getUserQuery = `
        SELECT id, name, email, phone, address, role, is_active, created_at, last_login
        FROM users
        WHERE id = ?
    `;

    db.query(getUserQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error fetching user'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: results[0]
        });
    });
});

// Create User (Admin Only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, email, phone, address, password, role, is_active } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if user already exists
        const checkUserQuery = 'SELECT id FROM users WHERE email = ?';
        db.query(checkUserQuery, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error occurred'
                });
            }

            if (results.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Ensure is_active is 1 (active) or 0 (inactive)
            let activeValue = 1;
            if (typeof is_active !== 'undefined') {
                if (is_active === true || is_active === 1 || is_active === '1' || is_active === 'on') {
                    activeValue = 1;
                } else {
                    activeValue = 0;
                }
            }

            // Insert new user
            const insertUserQuery = `
                INSERT INTO users (name, email, phone, address, password, role, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            db.query(insertUserQuery, [name, email, phone, address, hashedPassword, role || 'user', activeValue], (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Error creating user'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'User created successfully',
                    data: {
                        id: result.insertId,
                        name: name,
                        email: email,
                        role: role || 'user'
                    }
                });
            });
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update User (Admin Only)
// Update User Role and Status (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { role, is_active } = req.body;

    // Validate role if provided
    if (role && !['user', 'admin'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Must be "user" or "admin"'
        });
    }

    // Only allow updating role and is_active
    if (typeof role !== 'undefined' && typeof is_active !== 'undefined') {
        const updateQuery = 'UPDATE users SET role = ?, is_active = ? WHERE id = ?';
        db.query(updateQuery, [role, is_active, userId], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating user'
                });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            res.json({
                success: true,
                message: 'User role and status updated successfully'
            });
        });
    } else if (typeof role !== 'undefined') {
        const updateQuery = 'UPDATE users SET role = ? WHERE id = ?';
        db.query(updateQuery, [role, userId], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating user role'
                });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            res.json({
                success: true,
                message: 'User role updated successfully'
            });
        });
    } else if (typeof is_active !== 'undefined') {
        const updateQuery = 'UPDATE users SET is_active = ? WHERE id = ?';
        db.query(updateQuery, [is_active, userId], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating user status'
                });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            res.json({
                success: true,
                message: 'User status updated successfully'
            });
        });
    } else {
        res.status(400).json({
            success: false,
            message: 'No valid fields to update. Only role and is_active can be changed.'
        });
    }
});

// Update User Status (Admin Only)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { is_active } = req.body;

    const updateStatusQuery = 'UPDATE users SET is_active = ? WHERE id = ?';
    db.query(updateStatusQuery, [is_active, userId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error updating user status'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User status updated successfully'
        });
    });
});

// Update User Role (Admin Only)
router.put('/:id/role', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Must be "user" or "admin"'
        });
    }

    const updateRoleQuery = 'UPDATE users SET role = ? WHERE id = ?';
    db.query(updateRoleQuery, [role, userId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error updating user role'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User role updated successfully'
        });
    });
});

// Delete User (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const userId = req.params.id;

    // Prevent deleting the current admin user
    if (userId == req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'Cannot delete your own account'
        });
    }

    const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
    db.query(deleteUserQuery, [userId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Error deleting user'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    });
});

// Forgot Password
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    // Check if user exists
    const checkUserQuery = 'SELECT id FROM users WHERE email = ?';
    db.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error occurred'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        // In a real application, you would send an actual email here
        // For now, we'll just return a success response
        res.json({
            success: true,
            message: 'Password reset link sent to your email'
        });
    });
});

module.exports = router;
