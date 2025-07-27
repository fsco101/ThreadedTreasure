const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadProductImage, uploadProductImages } = require('../middleware/upload');

// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/:id', ProductController.getProductById);

// Protected routes (admin only)
router.post('/', authenticateToken, authorize(['admin']), uploadProductImages, ProductController.createProduct);
router.put('/:id', authenticateToken, authorize(['admin']), uploadProductImages, ProductController.updateProduct);
router.delete('/:id', authenticateToken, authorize(['admin']), ProductController.deleteProduct);

module.exports = router;
