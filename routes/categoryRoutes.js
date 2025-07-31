const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/CategoryController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadCategoryImage } = require('../middleware/upload');
const mysql = require('mysql2/promise');


// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};
// Public routes
router.get('/', CategoryController.getAllCategories);
router.get('/with-count', CategoryController.getCategoriesWithProductCount);
router.get('/:id', CategoryController.getCategoryById);


// Protected routes (admin only)
router.post('/', authenticateToken, authorize(['admin']), uploadCategoryImage, CategoryController.createCategory);
router.put('/:id', authenticateToken, authorize(['admin']), uploadCategoryImage, CategoryController.updateCategory);
router.delete('/:id', authenticateToken, authorize(['admin']), CategoryController.deleteCategory);

module.exports = router;
