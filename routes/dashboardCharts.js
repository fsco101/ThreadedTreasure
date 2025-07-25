// Dashboard Charts Data API
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard-charts
router.get('/', async (req, res) => {
    try {
        // 1. Sales Data: Monthly sales for the last 12 months (real-time from DB)
        const salesRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%b') AS month,
                    MONTH(created_at) AS month_num,
                    COALESCE(SUM(total_amount), 0) AS sales,
                    COUNT(*) AS order_count
                FROM orders
                WHERE status IN ('delivered', 'shipped')
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY YEAR(created_at), MONTH(created_at)
                ORDER BY YEAR(created_at), MONTH(created_at)
            `, (err, results) => {
                if (err) return reject(err);
                
                // Always use real DB data; if empty, return empty array
                resolve(results);
            });
        });

        // 2. Category Analytics: Products and revenue per category (real-time)
        const categoryRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT 
                    c.name,
                    COUNT(p.id) AS product_count,
                    COALESCE(AVG(p.price), 0) AS avg_price,
                    COALESCE(SUM(CASE WHEN p.sale_price IS NOT NULL THEN 1 ELSE 0 END), 0) AS on_sale_count
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
                GROUP BY c.id, c.name
                ORDER BY product_count DESC
            `, (err, results) => {
                if (err) return reject(err);
                
                // Add value calculation for better visualization
                const enhancedResults = results.map(cat => ({
                    name: cat.name,
                    value: cat.product_count || 0,
                    avg_price: parseFloat(cat.avg_price) || 0,
                    on_sale_count: cat.on_sale_count || 0
                }));
                
                resolve(enhancedResults);
            });
        });

        // 3. Product Performance: Real revenue from DB
        const revenueRows = await new Promise((resolve, reject) => {
            // First try to get real revenue data
            db.query(`
                SELECT 
                    p.name,
                    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue,
                    COALESCE(SUM(oi.quantity), 0) AS units_sold,
                    p.price AS current_price
                FROM products p
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
                WHERE p.is_active = 1
                GROUP BY p.id, p.name, p.price
                ORDER BY revenue DESC, p.price DESC
                LIMIT 10
            `, (err, results) => {
                if (err) return reject(err);
                
                // Only use real DB revenue; no projections
                const performanceData = results.map(product => ({
                    name: product.name,
                    revenue: parseFloat(product.revenue),
                    units_sold: parseInt(product.units_sold),
                    current_price: parseFloat(product.current_price)
                }));
                performanceData.sort((a, b) => b.revenue - a.revenue);
                resolve(performanceData.slice(0, 10));
            });
        });

        // 4. Additional Analytics: User and Inventory insights (real-time)
        const analyticsRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admin_count,
                    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_users_30d,
                    (SELECT COUNT(*) FROM products WHERE is_active = 1) AS active_products,
                    (SELECT COALESCE(SUM(quantity), 0) FROM inventory) AS total_inventory,
                    (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending_orders
            `, (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || {});
            });
        });

        res.json({
            success: true,
            data: {
                salesData: salesRows,
                categoryData: categoryRows,
                productRevenueData: revenueRows,
                analyticsData: analyticsRows
            },
            meta: {
                timestamp: new Date().toISOString(),
                dataSource: 'threadedtreasure_db',
                hasRealSales: salesRows.some(row => parseFloat(row.sales) > 0 && row.order_count > 0)
            }
        });
    } catch (error) {
        console.error('Dashboard charts data error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching dashboard chart data',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
