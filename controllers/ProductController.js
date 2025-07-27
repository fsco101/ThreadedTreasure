const { promisePool } = require('../config/database');

class ProductController {
  // Create new product
  static async createProduct(req, res) {
    try {
      const { name, description, price, category_id, stock_quantity, is_active } = req.body;
      
      // Validate required fields
      if (!name || !price || !category_id) {
        return res.status(400).json({
          success: false,
          message: 'Name, price, and category_id are required'
        });
      }

      // Validate field lengths and types
      if (name.length > 191) {
        return res.status(400).json({
          success: false,
          message: 'Product name cannot exceed 191 characters'
        });
      }

      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0'
        });
      }
      
      // Handle multiple image uploads from req.files (uploaded via product_images field)
      let images = [];
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => `products/${file.filename}`);
      }
      
      const mainImage = images.length > 0 ? images[0] : 'products/placeholder.jpg'; // Default image
      
      // Start transaction
      const connection = await promisePool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Insert product (main_image cannot be null according to schema)
        const productQuery = `
          INSERT INTO products (name, description, price, category_id, main_image, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const [productResult] = await connection.execute(productQuery, [
          name.trim(), 
          description && description.trim() ? description.trim() : 'No description provided', // Ensure description is not empty
          parseFloat(price), 
          parseInt(category_id), 
          mainImage,
          is_active !== undefined ? parseInt(is_active) : 1
        ]);
        
        const productId = productResult.insertId;
        
        // Insert product images into product_images table
        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const imageQuery = `
              INSERT INTO product_images (product_id, image_path, alt_text, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, NOW(), NOW())
            `;
            await connection.execute(imageQuery, [
              productId,
              images[i],
              `${name} - Image ${i + 1}`,
              i + 1
            ]);
          }
        }
        
        // Create default inventory entry if stock_quantity is provided
        if (stock_quantity && parseInt(stock_quantity) > 0) {
          const inventoryQuery = `
            INSERT INTO inventory (product_id, size, color, quantity, created_at, updated_at)
            VALUES (?, ?, ?, ?, NOW(), NOW())
          `;
          await connection.execute(inventoryQuery, [
            productId,
            'One Size', // Default size
            'Default', // Default color
            parseInt(stock_quantity)
          ]);
        }
        
        await connection.commit();
        
        // Get total stock quantity from inventory table
        const [inventoryResult] = await connection.execute(
          'SELECT SUM(quantity) as total_stock FROM inventory WHERE product_id = ?',
          [productId]
        );
        const totalStock = inventoryResult[0]?.total_stock || 0;
        
        const product = {
          id: productId,
          name,
          description,
          price: parseFloat(price),
          category_id: parseInt(category_id),
          stock_quantity: totalStock, // Return calculated stock from inventory table
          main_image: mainImage,
          images: images,
          is_active: is_active !== undefined ? parseInt(is_active) : 1
        };
        
        res.status(201).json({
          success: true,
          message: 'Product created successfully',
          data: product
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get product by ID
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
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
      const [rows] = await promisePool.execute(query, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Get product images
      const imageQuery = `
        SELECT image_path, alt_text, sort_order 
        FROM product_images 
        WHERE product_id = ? 
        ORDER BY sort_order ASC
      `;
      const [imageRows] = await promisePool.execute(imageQuery, [id]);
      
      const product = rows[0];
      product.images = imageRows;
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all products
  static async getAllProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const categoryId = req.query.category_id ? parseInt(req.query.category_id) : null;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          p.*, 
          c.name as category_name,
          COALESCE(SUM(i.quantity), 0) as stock_quantity
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN inventory i ON p.id = i.product_id
      `;
      let queryParams = [];
      
      if (categoryId) {
        query += ' WHERE p.category_id = ?';
        queryParams.push(categoryId);
      }
      
      query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      const [rows] = await promisePool.execute(query, queryParams);
      
      // Get images for each product
      for (let product of rows) {
        const imageQuery = `
          SELECT image_path, alt_text, sort_order 
          FROM product_images 
          WHERE product_id = ? 
          ORDER BY sort_order ASC
        `;
        const [imageRows] = await promisePool.execute(imageQuery, [product.id]);
        product.images = imageRows;
      }
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM products';
      let countParams = [];
      
      if (categoryId) {
        countQuery += ' WHERE category_id = ?';
        countParams.push(categoryId);
      }
      
      const [countResult] = await promisePool.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update product
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, category_id, stock_quantity, is_active } = req.body;
      
      // Handle multiple image uploads from req.files (uploaded via product_images field)
      let images = [];
      let main_image = null;
      
      if (req.files && req.files.length > 0) {
        images = req.files.map(file => `products/${file.filename}`);
        main_image = images[0]; // First image becomes main image
      }
      
      // Start transaction
      const connection = await promisePool.getConnection();
      await connection.beginTransaction();
      
      try {
        // Update product (excluding stock_quantity from products table)
        const productFields = ['name = ?', 'description = ?', 'price = ?', 'category_id = ?', 'is_active = ?', 'updated_at = NOW()'];
        const productValues = [name, description, parseFloat(price), parseInt(category_id), is_active !== undefined ? parseInt(is_active) : 1];
        
        if (main_image) {
          productFields.push('main_image = ?');
          productValues.push(main_image);
        }
        
        productValues.push(id);
        
        const query = `UPDATE products SET ${productFields.join(', ')} WHERE id = ?`;
        const [result] = await connection.execute(query, productValues);
        
        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }
        
        // If new images are uploaded, delete old images and add new ones
        if (images.length > 0) {
          // Delete existing product images
          await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
          
          // Insert new product images
          for (let i = 0; i < images.length; i++) {
            const imageQuery = `
              INSERT INTO product_images (product_id, image_path, alt_text, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, NOW(), NOW())
            `;
            await connection.execute(imageQuery, [
              id,
              images[i],
              `${name} - Image ${i + 1}`,
              i + 1
            ]);
          }
        }
        
        // Update inventory if stock_quantity is provided
        if (stock_quantity !== undefined) {
          // First, check if inventory exists for this product
          const [inventoryCheck] = await connection.execute(
            'SELECT id FROM inventory WHERE product_id = ? LIMIT 1',
            [id]
          );
          
          if (inventoryCheck.length > 0) {
            // Update existing inventory (simple approach - update first entry)
            await connection.execute(
              'UPDATE inventory SET quantity = ?, updated_at = NOW() WHERE product_id = ? AND id = ?',
              [parseInt(stock_quantity), id, inventoryCheck[0].id]
            );
          } else {
            // Create new inventory entry
            await connection.execute(
              'INSERT INTO inventory (product_id, size, color, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
              [id, 'One Size', 'Default', parseInt(stock_quantity)]
            );
          }
        }
        
        await connection.commit();
        
        // Get updated product with stock quantity and images
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
          message: 'Product updated successfully',
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

  // Delete product
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      const [result] = await promisePool.execute('DELETE FROM products WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Search products
  static async searchProducts(req, res) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      const query = `
        SELECT 
          p.*, 
          c.name as category_name,
          COALESCE(SUM(i.quantity), 0) as stock_quantity
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.name LIKE ? OR p.description LIKE ?
        GROUP BY p.id
        ORDER BY p.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const searchPattern = `%${q}%`;
      const [rows] = await promisePool.execute(query, [searchPattern, searchPattern, limit, offset]);
      
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
}

module.exports = ProductController;
