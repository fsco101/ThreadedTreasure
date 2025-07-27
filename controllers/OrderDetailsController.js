const promisePool = require('../config/database').promisePool;

class OrderDetailsController {
    // Fetch order details for a specific user (order history)
    static async getOrderDetailsByUserId(req, res) {
        const userId = req.params.userId;
        try {
            // Fetch all orders for the user with all needed fields
            const [orders] = await promisePool.query(
                `SELECT o.id AS order_id, o.order_number, o.status, o.payment_status, o.total_amount, o.created_at
                 FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
                [userId]
            );

            // For each order, fetch the ordered products with all needed fields
            const orderDetails = [];
            for (const order of orders) {
                const [items] = await promisePool.query(
                    `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price AS price, oi.size, oi.color, p.main_image AS product_image
                     FROM order_items oi
                     LEFT JOIN products p ON oi.product_id = p.id
                     WHERE oi.order_id = ?`,
                    [order.order_id]
                );
                orderDetails.push({
                    order_id: order.order_id,
                    order_number: order.order_number,
                    status: order.status,
                    payment_status: order.payment_status,
                    total_amount: order.total_amount,
                    created_at: order.created_at,
                    order_items: items,
                    items: items // for table compatibility
                });
            }

            res.json({ success: true, orders: orderDetails });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
        }
    }
}

module.exports = OrderDetailsController;
