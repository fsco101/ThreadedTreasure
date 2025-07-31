const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const EmailService = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');
const OrderController = require('../controllers/OrderController');
const router = express.Router();

// Initialize email service
const emailService = new EmailService();

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TT${timestamp.slice(-6)}${random}`;
}

// Create new order
router.post('/', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    

    try {
        await connection.beginTransaction();

        const {
            items,
            paymentMethod,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            notes
        } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }
        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        // Get shipping info from request body (checkout form)
        const shippingAddress = req.body.shippingAddress || {};
        // Defensive: fallback to empty string if not provided
        const shippingName = shippingAddress.name || shippingAddress.fullName || '';
        const addressLine1 = shippingAddress.address1 || '';
        const addressLine2 = shippingAddress.address2 || '';
        const city = shippingAddress.city || '';
        const state = shippingAddress.state || '';
        const postalCode = shippingAddress.postal_code || shippingAddress.postalCode || '';
        const country = shippingAddress.country || 'United States';
        const shippingPhone = shippingAddress.phone || '';

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const [orderResult] = await connection.execute(`
            INSERT INTO orders (
                user_id, order_number, status, payment_status, payment_method,
                subtotal, total_amount,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            req.user.id,
            orderNumber,
            'pending',
            'pending',
            paymentMethod.method || paymentMethod,
            subtotal || 0,
            total || 0
        ]);

        const orderId = orderResult.insertId;

        // No shipping info update: orders table does not have these columns

        // Add order items
        for (const item of items) {
            await connection.execute(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, size, color, quantity, unit_price, total_price,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                orderId,
                item.id || item.product_id,
                item.name || item.product_name,
                item.size || 'M',
                item.color || 'Default',
                item.quantity || 1,
                item.price || 0,
                (item.price || 0) * (item.quantity || 1)
            ]);

            // Update inventory (if inventory tracking is enabled)
            try {
                await connection.execute(`
                    UPDATE inventory 
                    SET quantity = quantity - ? 
                    WHERE product_id = ? AND size = ? AND color = ? AND quantity >= ?
                `, [item.quantity, item.id, item.size, item.color, item.quantity]);
            } catch (inventoryError) {
                console.log('Inventory update failed (might not exist):', inventoryError.message);
            }
        }

        await connection.commit();

        // Get customer info for email
        const [customerRows] = await connection.execute(`
            SELECT email, name FROM users WHERE id = ?
        `, [req.user.id]);

        const customer = customerRows[0];
        const customerName = customer ? customer.name : 'Valued Customer';

        // Prepare order data for email
        const orderDataForEmail = {
            orderNumber,
            customer: {
                email: customer.email,
                name: customerName
            },
            items,
            shippingAddress: {
                name: shippingAddress.name || `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`,
                address_line_1: shippingAddress.address1 || shippingAddress.address_line_1 || '',
                address_line_2: shippingAddress.address2 || shippingAddress.address_line_2 || '',
                city: shippingAddress.city || '',
                state: shippingAddress.state || '',
                postal_code: shippingAddress.zipCode || shippingAddress.postal_code || '',
                country: shippingAddress.country || 'United States',
                phone: shippingAddress.phone || ''
            },
            paymentMethod,
            subtotal,
            shipping,
            tax: tax || 0,
            discount: discount || 0,
            total,
            createdAt: new Date()
        };

        // Send confirmation email
        try {
            const emailResult = await emailService.sendOrderConfirmation(orderDataForEmail);
            console.log('Email sent successfully:', emailResult);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the order if email fails
        }

        // Return success response
        res.json({
            success: true,
            message: 'Order placed successfully',
            order: {
                id: orderId,
                orderNumber,
                status: 'pending',
                total,
                items: items.length,
                customer: customerName,
                emailSent: true
            }
        });

        // TODO: Process payment
        // TODO: Update inventory

    } catch (error) {
        await connection.rollback();
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    } finally {
        await connection.end();
    }
});

// Get user orders
router.get('/', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [orders] = await connection.execute(`
            SELECT 
                o.id,
                o.order_number,
                o.status,
                o.payment_status,
                o.payment_method,
                o.subtotal,
                o.shipping_amount,
                o.total_amount,
                o.created_at,
                o.shipped_at,
                o.delivered_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    } finally {
        await connection.end();
    }
});

// Get specific order details
router.get('/:orderId', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const { orderId } = req.params;

        // Get order details
        const [orders] = await connection.execute(`
            SELECT * FROM orders WHERE id = ? AND user_id = ?
        `, [orderId, req.user.id]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Get order items
        const [items] = await connection.execute(`
            SELECT 
                oi.*,
                p.main_image as product_image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        order.items = items;

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order details'
        });
    } finally {
        await connection.end();
    }
});

// Cancel order
router.put('/:orderId/cancel', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const { orderId } = req.params;

        // Check if order exists and belongs to user
        const [orders] = await connection.execute(`
            SELECT status FROM orders WHERE id = ? AND user_id = ?
        `, [orderId, req.user.id]);

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];

        // Check if order can be cancelled
        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled. Only pending and processing orders can be cancelled.'
            });
        }

        // Get order items to restore inventory
        const [orderItems] = await connection.execute(`
            SELECT oi.product_id, oi.quantity, oi.size, oi.color, p.name as product_name
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        // Start transaction
        await connection.beginTransaction();

        // Update order status
        await connection.execute(`
            UPDATE orders SET status = 'cancelled' WHERE id = ?
        `, [orderId]);

        // Restore inventory if items were found
        if (orderItems.length > 0) {
            const InventoryController = require('../controllers/InventoryController');
            const restoreResult = await InventoryController.restoreInventory(orderItems, connection);
            
            if (!restoreResult.success) {
                await connection.rollback();
                return res.status(500).json({
                    success: false,
                    message: `Failed to restore inventory: ${restoreResult.message}`
                });
            }
        }

        // Commit transaction
        await connection.commit();

        res.json({
            success: true,
            message: 'Order cancelled successfully and inventory restored'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    } finally {
        await connection.end();
    }
});

// Validate promo code
router.post('/promo/validate', authenticateToken, async (req, res) => {
    try {
        const { code, subtotal } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Promo code is required'
            });
        }

        // Mock promo code validation (in production, this would check a database)
        const validCodes = {
            'WELCOME10': {
                type: 'percentage',
                value: 0.10,
                minAmount: 0,
                description: '10% off'
            },
            'SAVE20': {
                type: 'percentage',
                value: 0.20,
                minAmount: 50,
                description: '20% off orders over $50'
            },
            'FREESHIP': {
                type: 'free_shipping',
                value: 0,
                minAmount: 0,
                description: 'Free shipping'
            },
            'FIXED15': {
                type: 'fixed',
                value: 15,
                minAmount: 30,
                description: '$15 off orders over $30'
            }
        };

        const promoCode = validCodes[code.toUpperCase()];
        
        if (!promoCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid promo code'
            });
        }

        if (subtotal < promoCode.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum order amount of $${promoCode.minAmount} required`
            });
        }

        let discount = 0;
        if (promoCode.type === 'percentage') {
            discount = subtotal * promoCode.value;
        } else if (promoCode.type === 'fixed') {
            discount = promoCode.value;
        }

        res.json({
            success: true,
            discount,
            type: promoCode.type,
            description: promoCode.description
        });

    } catch (error) {
        console.error('Promo validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate promo code'
        });
    }
});

// Admin routes (for order management)
router.get('/admin/all', authenticateToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [orders] = await connection.execute(`
            SELECT 
                o.id,
                o.order_number,
                o.status,
                o.payment_status,
                o.payment_method,
                o.total_amount,
                o.created_at,
                u.name as customer_name,
                u.email as customer_email,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);

        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Get admin orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    } finally {
        await connection.end();
    }
});

// Admin: Get specific order details
router.get('/admin/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const connection = await mysql.createConnection(dbConfig);
    try {
        const { id } = req.params;
        // Get order details
        const [orders] = await connection.execute(`
            SELECT o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [id]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orders[0];
        // Get order items
        const [items] = await connection.execute(`
            SELECT oi.*, p.name as product_name, p.main_image as product_image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);
        order.order_items = items;
        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Admin get order details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order details' });
    } finally {
        await connection.end();
    }
});

// Admin: Update order status
router.patch('/admin/:id/status', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const connection = await mysql.createConnection(dbConfig);
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        // Validate status against database enum values
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }
        
        // Determine new payment_status based on status
        let paymentStatusUpdate = null;
        if (status === 'delivered') {
            paymentStatusUpdate = 'completed';  // Using 'completed' as per database enum
        } else if (status === 'refunded') {
            paymentStatusUpdate = 'refunded';
        } else if (status === 'cancelled') {
            paymentStatusUpdate = 'failed';     // Using 'failed' as closest match for cancelled
        } else if (status === 'processing') {
            paymentStatusUpdate = 'processing';
        }

        // Update both status and payment_status if needed
        if (paymentStatusUpdate) {
            await connection.execute(`
                UPDATE orders SET status = ?, payment_status = ?, updated_at = NOW() WHERE id = ?
            `, [status, paymentStatusUpdate, id]);
        } else {
            await connection.execute(`
                UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?
            `, [status, id]);
        }

        // Inventory management logic
        // Get current order status
        const [currentOrderRows] = await connection.execute('SELECT status FROM orders WHERE id = ?', [id]);
        const currentStatus = currentOrderRows.length > 0 ? currentOrderRows[0].status : null;
        const inventoryDeductedStatuses = ['processing', 'shipped', 'delivered'];
        const inventoryReturnedStatuses = ['cancelled', 'refunded'];
        const wasInventoryDeducted = inventoryDeductedStatuses.includes(currentStatus);
        const willInventoryBeDeducted = inventoryDeductedStatuses.includes(status);
        const willInventoryBeReturned = inventoryReturnedStatuses.includes(status);
        // Get order items
        const [orderItems] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
        // Deduct inventory if transitioning to processing/shipped/delivered for the first time
        if (!wasInventoryDeducted && willInventoryBeDeducted) {
            for (const item of orderItems) {
                const [inventoryResult] = await connection.execute(`
                    UPDATE inventory 
                    SET quantity = quantity - ? 
                    WHERE product_id = ? AND size = ? AND color = ? AND quantity >= ?
                `, [
                    item.quantity,
                    item.product_id,
                    item.size || 'One Size',
                    item.color || 'Default',
                    item.quantity
                ]);
                if (inventoryResult.affectedRows === 0) {
                    // Try to get current stock for error message
                    const [stockCheck] = await connection.execute(`
                        SELECT quantity FROM inventory 
                        WHERE product_id = ? AND size = ? AND color = ?
                    `, [
                        item.product_id,
                        item.size || 'One Size',
                        item.color || 'Default'
                    ]);
                    const currentStock = stockCheck.length > 0 ? stockCheck[0].quantity : 0;
                    throw new Error(`Insufficient stock for ${item.product_name}. Available: ${currentStock}, Required: ${item.quantity}`);
                }
            }
        }
        // Return inventory if transitioning to cancelled/refunded (only if inventory was previously deducted)
        else if (wasInventoryDeducted && willInventoryBeReturned) {
            for (const item of orderItems) {
                await connection.execute(`
                    UPDATE inventory 
                    SET quantity = quantity + ? 
                    WHERE product_id = ? AND size = ? AND color = ?
                `, [
                    item.quantity,
                    item.product_id,
                    item.size || 'One Size',
                    item.color || 'Default'
                ]);
            }
        }
        // Fetch complete order data for email notification
        const [orderRows] = await connection.execute(`
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [id]);

        if (orderRows.length > 0) {
            const order = orderRows[0];

            // Fetch order items
            const [itemRows] = await connection.execute(`
                SELECT 
                    oi.*,
                    p.name as product_name,
                    p.main_image as product_image
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [id]);

            // Prepare order data for email
            const orderData = {
                orderNumber: order.order_number || order.id,
                customer: {
                    name: order.customer_name || 'Unknown Customer',
                    email: order.customer_email,
                    phone: order.customer_phone
                },
                items: itemRows.map(item => ({
                    name: item.product_name || item.product_name,
                    quantity: item.quantity,
                    price: item.unit_price,
                    total: item.total_price,
                    size: item.size,
                    color: item.color,
                    image: item.product_image
                })),
                subtotal: order.subtotal || 0,
                shipping: 0, // Add shipping calculation if needed
                tax: 0, // Add tax calculation if needed
                total: order.total_amount || 0,
                status: status,
                payment_status: paymentStatusUpdate || order.payment_status,
                createdAt: order.created_at,
                updatedAt: new Date()
            };

            // Send email notification with PDF receipt
            try {
                const emailResult = await emailService.sendOrderStatusUpdateWithPDF(orderData);
                if (emailResult.success) {
                    console.log('✅ Order status update email sent successfully');
                } else {
                    console.error('❌ Failed to send order status update email:', emailResult.error);
                }
            } catch (emailError) {
                console.error('❌ Email service error:', emailError);
                // Don't fail the status update if email fails
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Order status updated successfully and notification sent',
            data: { status, payment_status: paymentStatusUpdate }
        });
    } catch (error) {
        console.error('Admin update order status error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update order status: ' + error.message 
        });
    } finally {
        await connection.end();
    }
});

// Admin: Delete/cancel order
router.delete('/admin/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const connection = await mysql.createConnection(dbConfig);
    try {
        const { id } = req.params;
        // Check if order exists
        const [orders] = await connection.execute('SELECT id FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        // Delete order items first (if needed)
        await connection.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
        // Delete order
        await connection.execute('DELETE FROM orders WHERE id = ?', [id]);
        res.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Admin delete order error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete order' });
    } finally {
        await connection.end();
    }
});

// Get user orders with detailed information for customer dashboard
router.get('/my-orders', authenticateToken, async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [orders] = await connection.execute(`
            SELECT 
                o.id,
                o.order_number,
                o.status,
                o.payment_status,
                o.total_amount,
                o.created_at
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    } finally {
        await connection.end();
    }
});

// Check if user has purchased a specific product
router.get('/user/:userId/check-purchase/:productId', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { userId, productId } = req.params;

        // Verify the user is accessing their own data or is an admin
        if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        connection = await mysql.createConnection(dbConfig);

        const [results] = await connection.execute(`
            SELECT COUNT(*) as purchase_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ? 
            AND oi.product_id = ? 
            AND o.payment_status = 'completed'
        `, [userId, productId]);

        const hasPurchased = results[0].purchase_count > 0;

        res.json({
            success: true,
            hasPurchased: hasPurchased
        });
    } catch (error) {
        console.error('Error checking purchase:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    } finally { 
        if (connection) await connection.end();
    }
});

module.exports = router;