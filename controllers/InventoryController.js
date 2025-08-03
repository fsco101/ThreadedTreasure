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
      console.log(`📦 Deducting inventory for ${items.length} items...`);
      
      // First, check all items have sufficient stock before making any changes
      const stockValidation = await this.checkInventoryAvailability(items, connection);
      if (!stockValidation.success) {
        console.error('❌ Insufficient stock detected:', stockValidation.insufficientItems);
        return {
          success: false,
          message: `Insufficient stock: ${stockValidation.insufficientItems.map(item => 
            `${item.product_name} (need ${item.required}, have ${item.available})`
          ).join(', ')}`
        };
      }

      // Proceed with deduction for each item
      for (const item of items) {
        console.log(`📉 Deducting ${item.quantity} units from product ${item.product_id} (${item.size || 'One Size'}, ${item.color || 'Default'})`);
        
        const [result] = await connection.execute(`
          UPDATE inventory 
          SET quantity = quantity - ?, updated_at = NOW()
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
          
          console.error(`❌ Failed to deduct inventory for product ${item.product_id}: Available: ${currentStock}, Required: ${item.quantity}`);
          return {
            success: false,
            message: `Insufficient stock for ${item.product_name || 'product'}. Available: ${currentStock}, Required: ${item.quantity}`
          };
        }

        console.log(`✅ Successfully deducted ${item.quantity} units from product ${item.product_id}`);
      }

      console.log('✅ All inventory deductions completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deducting inventory:', error);
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
      console.log(`📦 Restoring inventory for ${items.length} items...`);
      
      for (const item of items) {
        console.log(`📈 Restoring ${item.quantity} units to product ${item.product_id} (${item.size || 'One Size'}, ${item.color || 'Default'})`);
        
        // Check if inventory record exists, create if it doesn't
        const [existingInventory] = await connection.execute(`
          SELECT id, quantity FROM inventory 
          WHERE product_id = ? AND size = ? AND color = ?
        `, [
          item.product_id,
          item.size || 'One Size',
          item.color || 'Default'
        ]);

        if (existingInventory.length > 0) {
          // Update existing inventory record
          await connection.execute(`
            UPDATE inventory 
            SET quantity = quantity + ?, updated_at = NOW()
            WHERE product_id = ? AND size = ? AND color = ?
          `, [
            item.quantity,
            item.product_id,
            item.size || 'One Size',
            item.color || 'Default'
          ]);
          
          console.log(`✅ Updated existing inventory: ${existingInventory[0].quantity} + ${item.quantity} = ${existingInventory[0].quantity + item.quantity}`);
        } else {
          // Create new inventory record if none exists
          await connection.execute(`
            INSERT INTO inventory (product_id, size, color, quantity, created_at, updated_at) 
            VALUES (?, ?, ?, ?, NOW(), NOW())
          `, [
            item.product_id,
            item.size || 'One Size',
            item.color || 'Default',
            item.quantity
          ]);
          
          console.log(`✅ Created new inventory record with ${item.quantity} units`);
        }
      }

      console.log('✅ All inventory restorations completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error restoring inventory:', error);
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

    console.log(`📦 Inventory Status Change: ${currentStatus} → ${newStatus}`);
    console.log(`🔍 Was deducted: ${wasInventoryDeducted}, Will be deducted: ${willInventoryBeDeducted}, Will be returned: ${willInventoryBeReturned}`);

    // Deduct inventory if transitioning to processing/shipped/delivered for the first time
    if (!wasInventoryDeducted && willInventoryBeDeducted) {
      console.log('📉 Deducting inventory...');
      const result = await this.deductInventory(orderItems, connection);
      if (!result.success) {
        console.error('❌ Inventory deduction failed:', result.message);
        return result;
      }
      console.log('✅ Inventory deducted successfully');
    }
    // Restore inventory if transitioning from deducted status to cancelled/refunded
    else if (wasInventoryDeducted && willInventoryBeReturned) {
      console.log('📈 Restoring inventory...');
      const result = await this.restoreInventory(orderItems, connection);
      if (!result.success) {
        console.error('❌ Inventory restoration failed:', result.message);
        return result;
      }
      console.log('✅ Inventory restored successfully');
    }
    // Handle special case: pending to cancelled (no inventory change needed)
    else if (currentStatus === 'pending' && newStatus === 'cancelled') {
      console.log('ℹ️ No inventory change needed (pending → cancelled)');
    }
    // Handle other transitions that don't require inventory changes
    else {
      console.log('ℹ️ No inventory change required for this status transition');
    }

    return { success: true };
  }

  /**
   * Log inventory movement for audit trail
   * @param {Object} movement - Movement details
   * @param {Object} connection - Database connection
   */
  static async logInventoryMovement(movement, connection) {
    try {
      // This would insert into an inventory_movements table if you have one
      // For now, we'll just log to console
      console.log('📋 Inventory Movement:', {
        timestamp: new Date().toISOString(),
        product_id: movement.product_id,
        size: movement.size || 'One Size',
        color: movement.color || 'Default',
        quantity_change: movement.quantity_change,
        movement_type: movement.movement_type, // 'deduct', 'restore', 'adjustment'
        reason: movement.reason,
        order_id: movement.order_id || null,
        previous_quantity: movement.previous_quantity,
        new_quantity: movement.new_quantity
      });
      
      // Uncomment and modify if you want to create an inventory_movements table:
      /*
      await connection.execute(`
        INSERT INTO inventory_movements 
        (product_id, size, color, quantity_change, movement_type, reason, order_id, 
         previous_quantity, new_quantity, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        movement.product_id,
        movement.size || 'One Size',
        movement.color || 'Default',
        movement.quantity_change,
        movement.movement_type,
        movement.reason,
        movement.order_id || null,
        movement.previous_quantity,
        movement.new_quantity
      ]);
      */
    } catch (error) {
      console.error('Error logging inventory movement:', error);
      // Don't fail the main operation if logging fails
    }
  }

  /**
   * Get inventory movement history for a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getInventoryMovements(req, res) {
    try {
      const { id } = req.params; // product ID
      const limit = parseInt(req.query.limit) || 50;
      
      // This would query inventory_movements table if you have one
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Inventory movements tracking not yet implemented',
        data: {
          product_id: id,
          movements: [],
          note: 'To enable inventory movement tracking, create an inventory_movements table and uncomment the code in logInventoryMovement method'
        }
      });
      
      // Uncomment when you have inventory_movements table:
      /*
      const query = `
        SELECT * FROM inventory_movements 
        WHERE product_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      const [rows] = await promisePool.execute(query, [id, limit]);
      
      res.json({
        success: true,
        data: rows
      });
      */
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
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
   * Bulk update inventory for multiple products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async bulkUpdateInventory(req, res) {
    try {
      const { updates } = req.body; // Array of {product_id, size, color, quantity}
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }

      const connection = await promisePool.getConnection();
      await connection.beginTransaction();

      try {
        const results = [];
        
        for (const update of updates) {
          const { product_id, size, color, quantity } = update;
          
          if (quantity === undefined || quantity < 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: `Invalid quantity for product ${product_id}`
            });
          }

          const inventorySize = size || 'One Size';
          const inventoryColor = color || 'Default';

          // Check if inventory record exists
          const [inventoryCheck] = await connection.execute(
            'SELECT id, quantity FROM inventory WHERE product_id = ? AND size = ? AND color = ?',
            [product_id, inventorySize, inventoryColor]
          );

          let previousQuantity = 0;
          
          if (inventoryCheck.length > 0) {
            previousQuantity = inventoryCheck[0].quantity;
            // Update existing inventory
            await connection.execute(
              'UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE product_id = ? AND size = ? AND color = ?',
              [parseInt(quantity), product_id, inventorySize, inventoryColor]
            );
          } else {
            // Create new inventory record
            await connection.execute(
              'INSERT INTO inventory (product_id, size, color, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
              [product_id, inventorySize, inventoryColor, parseInt(quantity)]
            );
          }

          // Log the movement
          await this.logInventoryMovement({
            product_id: product_id,
            size: inventorySize,
            color: inventoryColor,
            quantity_change: parseInt(quantity) - previousQuantity,
            movement_type: 'adjustment',
            reason: 'Bulk inventory update',
            previous_quantity: previousQuantity,
            new_quantity: parseInt(quantity)
          }, connection);

          results.push({
            product_id: product_id,
            size: inventorySize,
            color: inventoryColor,
            previous_quantity: previousQuantity,
            new_quantity: parseInt(quantity),
            change: parseInt(quantity) - previousQuantity
          });
        }

        await connection.commit();
        
        res.json({
          success: true,
          message: `Successfully updated inventory for ${results.length} items`,
          data: results
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
