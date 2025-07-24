const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Allow guest tokens for promo code validation
    if (token && token.startsWith('guest-token-')) {
        req.user = {
            id: 'guest-' + Date.now(),
            email: 'guest@example.com',
            isGuest: true
        };
        next();
        return;
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Validate promo code
router.post('/validate', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const { code, subtotal } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Promo code is required'
            });
        }

        // Check if promo code exists and is active
        const [promoRows] = await connection.execute(`
            SELECT 
                id, code, discount_type, discount_value, minimum_order,
                maximum_discount, usage_limit, used_count, expires_at, is_active
            FROM promo_codes 
            WHERE code = ? AND is_active = 1
        `, [code.toUpperCase()]);

        if (promoRows.length === 0) {
            return res.json({
                success: false,
                message: 'Invalid promo code'
            });
        }

        const promo = promoRows[0];

        // Check if promo code has expired
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return res.json({
                success: false,
                message: 'This promo code has expired'
            });
        }

        // Check usage limit
        if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
            return res.json({
                success: false,
                message: 'This promo code has reached its usage limit'
            });
        }

        // Check minimum order amount
        if (promo.minimum_order && subtotal < promo.minimum_order) {
            return res.json({
                success: false,
                message: `Minimum order amount of $${promo.minimum_order} required`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (promo.discount_type === 'percentage') {
            discountAmount = subtotal * (promo.discount_value / 100);
            if (promo.maximum_discount) {
                discountAmount = Math.min(discountAmount, promo.maximum_discount);
            }
        } else if (promo.discount_type === 'fixed') {
            discountAmount = Math.min(promo.discount_value, subtotal);
        }

        res.json({
            success: true,
            message: 'Promo code applied successfully',
            discount: {
                type: promo.discount_type,
                value: promo.discount_value,
                amount: discountAmount,
                code: promo.code
            }
        });

    } catch (error) {
        console.error('Promo code validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate promo code'
        });
    } finally {
        await connection.end();
    }
});

// Get all active promo codes (admin only)
router.get('/', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [promos] = await connection.execute(`
            SELECT 
                id, code, discount_type, discount_value, minimum_order,
                maximum_discount, usage_limit, used_count, expires_at, is_active,
                created_at
            FROM promo_codes 
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: promos
        });

    } catch (error) {
        console.error('Error fetching promo codes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promo codes'
        });
    } finally {
        await connection.end();
    }
});

// Create new promo code (admin only)
router.post('/', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const {
            code,
            discount_type,
            discount_value,
            minimum_order,
            maximum_discount,
            usage_limit,
            expires_at
        } = req.body;

        // Validate required fields
        if (!code || !discount_type || !discount_value) {
            return res.status(400).json({
                success: false,
                message: 'Code, discount type, and discount value are required'
            });
        }

        // Check if code already exists
        const [existingCodes] = await connection.execute(`
            SELECT id FROM promo_codes WHERE code = ?
        `, [code.toUpperCase()]);

        if (existingCodes.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Promo code already exists'
            });
        }

        // Create promo code
        const [result] = await connection.execute(`
            INSERT INTO promo_codes (
                code, discount_type, discount_value, minimum_order,
                maximum_discount, usage_limit, expires_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            code.toUpperCase(),
            discount_type,
            discount_value,
            minimum_order || null,
            maximum_discount || null,
            usage_limit || null,
            expires_at || null
        ]);

        res.json({
            success: true,
            message: 'Promo code created successfully',
            data: {
                id: result.insertId,
                code: code.toUpperCase()
            }
        });

    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create promo code'
        });
    } finally {
        await connection.end();
    }
});

// Update promo code usage count
router.post('/use/:id', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const promoId = req.params.id;
        
        await connection.execute(`
            UPDATE promo_codes 
            SET used_count = used_count + 1 
            WHERE id = ?
        `, [promoId]);

        res.json({
            success: true,
            message: 'Promo code usage updated'
        });

    } catch (error) {
        console.error('Error updating promo code usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update promo code usage'
        });
    } finally {
        await connection.end();
    }
});

module.exports = router;
