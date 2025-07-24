// Dashboard Charts Data API
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard-charts
router.get('/', async (req, res) => {
    try {
        // 1. Sales Data: Monthly sales totals for the last 12 months
        const salesRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT DATE_FORMAT(created_at, '%b') AS month, SUM(total_amount) AS sales
                FROM orders
                WHERE status = 'delivered'
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY YEAR(created_at), MONTH(created_at)
                ORDER BY YEAR(created_at), MONTH(created_at)
            `, (err, results) => err ? reject(err) : resolve(results));
        });

        // 2. Category Data: Product count per category
        const categoryRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT c.name, COUNT(p.id) AS value
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                GROUP BY c.id
            `, (err, results) => err ? reject(err) : resolve(results));
        });

        // 3. Product Revenue Data: Top 10 products by revenue
        const revenueRows = await new Promise((resolve, reject) => {
            db.query(`
                SELECT p.name, SUM(oi.quantity * oi.price) AS revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'delivered'
                GROUP BY oi.product_id
                ORDER BY revenue DESC
                LIMIT 10
            `, (err, results) => err ? reject(err) : resolve(results));
        });

        res.json({
            success: true,
            data: {
                salesData: salesRows,
                categoryData: categoryRows,
                productRevenueData: revenueRows
            }
        });
    } catch (error) {
        console.error('Dashboard charts data error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard chart data' });
    }
});

module.exports = router;
