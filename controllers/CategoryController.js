const mysql = require('mysql2/promise');
const { promisePool } = require('../config/database');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};

class CategoryController {
  // Create new category
  static async createCategory(req, res) {
    try {
      const { name, description } = req.body;
      
      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }
      
      // Handle image upload
      let image = null;
      if (req.file) {
        image = req.file.path;
      }
      
      const query = `
        INSERT INTO categories (name, description, image, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;
      const [result] = await promisePool.execute(query, [name, description, image]);
      
      const category = {
        id: result.insertId,
        name,
        description,
        image
      };
      
      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get category by ID
  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      
      const [rows] = await promisePool.execute('SELECT * FROM categories WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      res.json({
        success: true,
        data: rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all categories
  static async getAllCategories(req, res) {
    try {
      const [rows] = await promisePool.execute('SELECT * FROM categories ORDER BY name ASC');
      
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

  // Update category
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      // Handle image upload
      let image = null;
      if (req.file) {
        image = req.file.path;
      }
      
      const query = `
        UPDATE categories 
        SET name = ?, description = ?, image = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const [result] = await promisePool.execute(query, [name, description, image, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      // Get updated category
      const [rows] = await promisePool.execute('SELECT * FROM categories WHERE id = ?', [id]);
      
      res.json({
        success: true,
        message: 'Category updated successfully',
        data: rows[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete category
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      
      // Check if category has products
      const [products] = await promisePool.execute('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
      
      if (products[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with existing products'
        });
      }
      
      const [result] = await promisePool.execute('DELETE FROM categories WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get categories with product count
  static async getCategoriesWithProductCount(req, res) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [categories] = await connection.execute(`
            SELECT 
                c.*, 
                (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS products_count
            FROM categories c
        `);
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) await connection.end();
    }
  }
}

module.exports = CategoryController;
