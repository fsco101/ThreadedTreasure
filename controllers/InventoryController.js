const { promisePool } = require('../config/database');

class InventoryController {
  /**
   * Check if sufficient inventory is available for order items
   * @param {Array} items - Array of order items with product_id, quantity, size, color
   * @param {Object} connection - Database connection (optional, will create if not provided)
   * @returns {Object} { success: boolean, message?: string, insufficientItems?: Array }
   */
  static async checkInventoryAvailability(items, connection = null) {
    const shouldCloseConnection = !connection;
    if (!connection) {
      connection = await promisePool.getConnection();
    }

    try {
      const insufficientItems = [];

      for (const item of items) {
        const [inventoryCheck] = await connection.execute(`
          SELECT quantity FROM inventory 
          WHERE product_id = ? AND size = ? AND color = ?
        `, [
          item.product_id, 
          item.size || 'One Size', 
          item.color || 'Default'
        ]);

        const availableStock = inventoryCheck.length > 0 ? inventoryCheck[0].quantity : 0;
        
        if (availableStock < item.quantity) {
          insufficientItems.push({
            product_id: item.product_id,
            product_name: item.product_name || `Product ${item.product_id}`,
            required: item.quantity,
            available: availableStock,
            size: item.size || 'One Size',
            color: item.color || 'Default'
          });
        }
      }

      if (insufficientItems.length > 0) {
        return {
          success: false,
          message: 'Insufficient inventory for some items',
          insufficientItems
        };
      }

      return { success: true };
    } finally {
      if (shouldCloseConnection) {
        connection.release();
      }
    }
  }

  /**
   * Deduct inventory for order items (when order status changes to processing/shipped/delivered)
   * @param {Array} items - Array of order items
   * @param {Object} connection - Database connection (required for transaction)
   * @returns {Object} { success: boolean, message?: string }
   */
  static async deductInventory(items, connection) {
    try {
      for (const item of items) {
        const [result] = await connection.execute(`
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

        if (result.affectedRows === 0) {
          // Get current stock for detailed error message
          const [stockCheck] = await connection.execute(`
            SELECT quantity FROM inventory 
            WHERE product_id = ? AND size = ? AND color = ?
          `, [
            item.product_id,
            item.size || 'One Size',
            item.color || 'Default'
          ]);

          const currentStock = stockCheck.length > 0 ? stockCheck[0].quantity : 0;
          
          return {
            success: false,
            message: `Insufficient stock for ${item.product_name || 'product'}. Available: ${currentStock}, Required: ${item.quantity}`
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error deducting inventory:', error);
      return {
        success: false,
        message: 'Failed to deduct inventory: ' + error.message
      };
    }
  }

  /**
   * Restore inventory for order items (when order is cancelled/refunded)
   * @param {Array} items - Array of order items
   * @param {Object} connection - Database connection (required for transaction)
   * @returns {Object} { success: boolean, message?: string }
   */
  static async restoreInventory(items, connection) {
    try {
      for (const item of items) {
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

      return { success: true };
    } catch (error) {
      console.error('Error restoring inventory:', error);
      return {
        success: false,
        message: 'Failed to restore inventory: ' + error.message
      };
    }
  }

  /**
   * Handle inventory changes based on order status transitions
   * @param {string} currentStatus - Current order status
   * @param {string} newStatus - New order status
   * @param {Array} orderItems - Array of order items
   * @param {Object} connection - Database connection (required for transaction)
   * @returns {Object} { success: boolean, message?: string }
   */
  static async handleOrderStatusInventoryChange(currentStatus, newStatus, orderItems, connection) {
    const inventoryDeductedStatuses = ['processing', 'shipped', 'delivered'];
    const inventoryReturnedStatuses = ['cancelled', 'refunded'];
    
    const wasInventoryDeducted = inventoryDeductedStatuses.includes(currentStatus);
    const willInventoryBeDeducted = inventoryDeductedStatuses.includes(newStatus);
    const willInventoryBeReturned = inventoryReturnedStatuses.includes(newStatus);

    // Deduct inventory if transitioning to processing/shipped/delivered for the first time
    if (!wasInventoryDeducted && willInventoryBeDeducted) {
      const result = await this.deductInventory(orderItems, connection);
      if (!result.success) {
        return result;
      }
    }
    // Restore inventory if transitioning from deducted status to cancelled/refunded
    else if (wasInventoryDeducted && willInventoryBeReturned) {
      const result = await this.restoreInventory(orderItems, connection);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  /**
   * Get inventory details for a specific product
   * @param {number} productId - Product ID
   * @returns {Object} { success: boolean, data?: Object, message?: string }
   */
  static async getProductInventory(req, res) {
    try {
      const { id } = req.params;
      
      // Get product basic info
      const productQuery = `
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
      `;
      const [productRows] = await promisePool.execute(productQuery, [id]);
      
      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Get inventory details
      const inventoryQuery = `
        SELECT id, size, color, quantity, created_at, updated_at
        FROM inventory 
        WHERE product_id = ?
        ORDER BY size, color
      `;
      const [inventoryRows] = await promisePool.execute(inventoryQuery, [id]);
      
      // Calculate total stock
      const totalStock = inventoryRows.reduce((sum, item) => sum + item.quantity, 0);
      
      res.json({
        success: true,
        data: {
          product: productRows[0],
          inventory: inventoryRows,
          total_stock: totalStock
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update inventory for a specific product/size/color combination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateInventory(req, res) {
    try {
      const { id } = req.params; // product ID
      const { quantity, size, color } = req.body;
      
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }
      
      // Start transaction
      const connection = await promisePool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Check if product exists
        const [productCheck] = await connection.execute('SELECT id FROM products WHERE id = ?', [id]);
        if (productCheck.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        const inventorySize = size || 'One Size';
        const inventoryColor = color || 'Default';
        
        // Check if inventory record exists for this product/size/color combination
        const [inventoryCheck] = await connection.execute(
          'SELECT id FROM inventory WHERE product_id = ? AND size = ? AND color = ?',
          [id, inventorySize, inventoryColor]
        );
        
        if (inventoryCheck.length > 0) {
          // Update existing inventory
          await connection.execute(
            'UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE product_id = ? AND size = ? AND color = ?',
            [parseInt(quantity), id, inventorySize, inventoryColor]
          );
        } else {
          // Create new inventory record
          await connection.execute(
            'INSERT INTO inventory (product_id, size, color, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [id, inventorySize, inventoryColor, parseInt(quantity)]
          );
        }
        
        await connection.commit();
        
        // Get updated product with total stock
        const selectQuery = `
          SELECT 
            p.*, 
            c.name as category_name,
            COALESCE(SUM(i.quantity), 0) as stock_quantity
          FROM products p 
          LEFT JOIN categories c ON p.category_id = c.id 
          LEFT JOIN inventory i ON p.id = i.product_id
          WHERE p.id = ?
          GROUP BY p.id
        `;
        const [rows] = await connection.execute(selectQuery, [id]);
        
        res.json({
          success: true,
          message: 'Inventory updated successfully',
          data: rows[0]
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Update specific inventory item by inventory ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateInventoryItem(req, res) {
    try {
      const { id } = req.params; // inventory item id
      const { quantity } = req.body;
      
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid quantity is required'
        });
      }
      
      const [result] = await promisePool.execute(
        'UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE id = ?',
        [parseInt(quantity), id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }
      
      // Get updated inventory item
      const [rows] = await promisePool.execute('SELECT * FROM inventory WHERE id = ?', [id]);
      
      res.json({
        success: true,
        message: 'Inventory updated successfully',
        data: rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get low stock products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getLowStockProducts(req, res) {
    try {
      const threshold = parseInt(req.query.threshold) || 10;
      
      const query = `
        SELECT 
          p.*, 
          c.name as category_name,
          COALESCE(SUM(i.quantity), 0) as stock_quantity
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
        HAVING stock_quantity <= ?
        ORDER BY stock_quantity ASC
      `;
      const [rows] = await promisePool.execute(query, [threshold]);
      
      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get inventory reports and analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getInventoryReport(req, res) {
    try {
      // Get overall inventory statistics
      const [statsRows] = await promisePool.execute(`
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          COALESCE(SUM(i.quantity), 0) as total_inventory,
          COUNT(CASE WHEN COALESCE(SUM(i.quantity), 0) = 0 THEN 1 END) as out_of_stock_products,
          COUNT(CASE WHEN COALESCE(SUM(i.quantity), 0) BETWEEN 1 AND 10 THEN 1 END) as low_stock_products
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
      `);

      // Get top products by stock quantity
      const [topStockRows] = await promisePool.execute(`
        SELECT 
          p.id,
          p.name,
          p.price,
          c.name as category_name,
          COALESCE(SUM(i.quantity), 0) as stock_quantity
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY stock_quantity DESC
        LIMIT 10
      `);

      // Get products that need restocking
      const [restockRows] = await promisePool.execute(`
        SELECT 
          p.id,
          p.name,
          p.price,
          c.name as category_name,
          COALESCE(SUM(i.quantity), 0) as stock_quantity
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
        HAVING stock_quantity <= 10
        ORDER BY stock_quantity ASC
      `);

      res.json({
        success: true,
        data: {
          statistics: statsRows[0] || {},
          top_stock_products: topStockRows,
          restock_needed: restockRows
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = InventoryController;
