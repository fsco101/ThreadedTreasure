const { promisePool } = require('../config/database');

class OrderController {
  // Get user's orders
  static async getUserOrders(req, res) {
    try {
        const userId = req.user.id;

        // Get all orders for the user
        const [orders] = await promisePool.execute(`
            SELECT o.*, COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [userId]);

        // For each order, fetch its items
        for (const order of orders) {
            const [items] = await promisePool.execute(`
                SELECT oi.*, p.name as product_name, p.main_image as product_image
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [order.id]);
            order.order_items = items;
        }

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
  }

  // Get specific order by ID
  static async getOrderById(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      // Get order details
      const orderQuery = `
        SELECT o.*, ua.first_name, ua.last_name, ua.address_line_1, ua.address_line_2, 
               ua.city, ua.state, ua.postal_code, ua.country
        FROM orders o
        LEFT JOIN user_addresses ua ON o.shipping_address_id = ua.id
        WHERE o.id = ? AND o.user_id = ?
      `;
      
      const [orders] = await promisePool.execute(orderQuery, [orderId, userId]);
      
      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = orders[0];

      // Get order items
      const itemsQuery = `
        SELECT oi.*, p.name as current_product_name, p.main_image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
        ORDER BY oi.id
      `;
      
      const [items] = await promisePool.execute(itemsQuery, [orderId]);
      order.items = items;

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order details'
      });
    }
  }

  // Create new order
  static async createOrder(req, res) {
    try {
      const userId = req.user.id;
      const { 
        items, 
        shipping_address_id, 
        payment_method, 
        subtotal, 
        shipping_amount, 
        total_amount 
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Order must contain at least one item'
        });
      }

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const connection = await promisePool.getConnection();
      await connection.beginTransaction();

      try {
        // Create order
        const orderQuery = `
          INSERT INTO orders (user_id, order_number, subtotal, shipping_amount, total_amount, 
                             shipping_address_id, payment_method, status, payment_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())
        `;
        
        const [orderResult] = await connection.execute(orderQuery, [
          userId, 
          orderNumber, 
          subtotal, 
          shipping_amount, 
          total_amount, 
          shipping_address_id, 
          payment_method
        ]);

        const orderId = orderResult.insertId;

        // Validate inventory before creating order items
        for (const item of items) {
          const [inventoryCheck] = await connection.execute(`
            SELECT quantity FROM inventory 
            WHERE product_id = ? AND size = ? AND color = ?
          `, [item.product_id, item.size || 'One Size', item.color || 'Default']);

          const availableStock = inventoryCheck.length > 0 ? inventoryCheck[0].quantity : 0;
          
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.product_name}. Available: ${availableStock}, Requested: ${item.quantity}`);
          }
        }

        // Create order items (don't reduce inventory yet - only reduce when status changes to processing/shipped/delivered)
        for (const item of items) {
          const itemQuery = `
            INSERT INTO order_items (order_id, product_id, product_name, size, color, 
                                   quantity, unit_price, total_price, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `;
          
          await connection.execute(itemQuery, [
            orderId,
            item.product_id,
            item.product_name,
            item.size || null,
            item.color || null,
            item.quantity,
            item.unit_price,
            item.total_price
          ]);
        }

        await connection.commit();

        // Return created order
        const [createdOrder] = await connection.execute(
          'SELECT * FROM orders WHERE id = ?', 
          [orderId]
        );

        res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: createdOrder[0]
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create order'
      });
    }
  }

  // Update order status (admin only)
  static async updateOrderStatus(req, res) {
    try {
        const orderId = req.params.id;
        const { status, tracking_number } = req.body;

        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const connection = await promisePool.getConnection();
        await connection.beginTransaction();

        try {
            // Get current order status
            const [currentOrderRows] = await connection.execute('SELECT status FROM orders WHERE id = ?', [orderId]);
            if (currentOrderRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            const currentStatus = currentOrderRows[0].status;

            // Get order items
            const [orderItems] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

            const inventoryDeductedStatuses = ['processing', 'shipped', 'delivered'];
            const inventoryReturnedStatuses = ['cancelled', 'refunded'];
            const wasInventoryDeducted = inventoryDeductedStatuses.includes(currentStatus);
            const willInventoryBeDeducted = inventoryDeductedStatuses.includes(status);
            const willInventoryBeReturned = inventoryReturnedStatuses.includes(status);

            // Deduct inventory if transitioning to deducted status for the first time
            if (!wasInventoryDeducted && willInventoryBeDeducted) {
                for (const item of orderItems) {
                    // Use your inventory table and default values
                    const [result] = await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity - ? 
                         WHERE product_id = ? AND size = ? AND color = ? AND quantity >= ?`,
                        [
                            item.quantity,
                            item.product_id,
                            item.size || 'One Size',
                            item.color || 'Default',
                            item.quantity
                        ]
                    );
                    if (result.affectedRows === 0) {
                        await connection.rollback();
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.product_name}` });
                    }
                }
            }
            // Rollback inventory if transitioning from deducted status to cancelled/refunded
            else if (wasInventoryDeducted && willInventoryBeReturned) {
                for (const item of orderItems) {
                    await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity + ? 
                         WHERE product_id = ? AND size = ? AND color = ?`,
                        [
                            item.quantity,
                            item.product_id,
                            item.size || 'One Size',
                            item.color || 'Default'
                        ]
                    );
                }
            }

            // Update order status
            const updateFields = ['status = ?', 'updated_at = NOW()'];
            const updateValues = [status];
            if (tracking_number) {
                updateFields.push('tracking_number = ?');
                updateValues.push(tracking_number);
            }
            if (status === 'shipped') {
                updateFields.push('shipped_at = NOW()');
            } else if (status === 'delivered') {
                updateFields.push('delivered_at = NOW()');
            }
            updateValues.push(orderId);
            if (!wasInventoryDeducted && willInventoryBeDeducted) {
                for (const item of orderItems) {
                    const [result] = await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity - ? 
                         WHERE product_id = ? AND size = ? AND color = ? AND quantity >= ?`,
                        [
                            item.quantity,
                            item.product_id,
                            item.size || 'One Size',
                            item.color || 'Default',
                            item.quantity
                        ]
                    );
                    if (result.affectedRows === 0) {
                        // Try to get current stock for error message
                        const [stockCheck] = await connection.execute(
                            `SELECT quantity FROM inventory 
                             WHERE product_id = ? AND size = ? AND color = ?`,
                            [
                                item.product_id,
                                item.size || 'One Size',
                                item.color || 'Default'
                            ]
                        );
                        const currentStock = stockCheck.length > 0 ? stockCheck[0].quantity : 0;
                        await connection.rollback();
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.product_name}. Available: ${currentStock}, Required: ${item.quantity}` });
                    }
                }
            } else if (wasInventoryDeducted && willInventoryBeReturned) {
                for (const item of orderItems) {
                    await connection.execute(
                        `UPDATE inventory 
                         SET quantity = quantity + ? 
                         WHERE product_id = ? AND size = ? AND color = ?`,
                        [
                            item.quantity,
                            item.product_id,
                            item.size || 'One Size',
                            item.color || 'Default'
                        ]
                    );
                }
            }

            // Update order status in the database
            const updateQuery = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
            await connection.execute(updateQuery, updateValues);

            await connection.commit();

            res.json({
                success: true,
                message: 'Order status updated successfully'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
  }


    // Cancel order
    static async cancelOrder(req, res) {
    try {
      const orderId = req.params.id;
      const userId = req.user.id;

      // Check if order exists and belongs to user
      const [orders] = await promisePool.execute(
        'SELECT * FROM orders WHERE id = ? AND user_id = ?', 
        [orderId, userId]
      );

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = orders[0];

      // Only restore inventory if it was previously deducted
      const inventoryDeductedStatuses = ['processing', 'shipped', 'delivered'];
      if (inventoryDeductedStatuses.includes(order.status)) {
        const [orderItems] = await promisePool.execute(
          'SELECT * FROM order_items WHERE order_id = ?', 
          [orderId]
        );

        for (const item of orderItems) {
          await promisePool.execute(`
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

      // Update order status
      await promisePool.execute(
        'UPDATE orders SET status = "cancelled", updated_at = NOW() WHERE id = ?', 
        [orderId]
      );

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order'
      });
    }
  }
}

module.exports = OrderController;
