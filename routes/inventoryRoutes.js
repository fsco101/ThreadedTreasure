const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const { authenticateToken } = require('../middleware/auth');

// Admin only routes for inventory management
// Get inventory details for a specific product
router.get('/products/:id', authenticateToken, InventoryController.getProductInventory);

// Update inventory for a specific product (with size/color)
router.put('/products/:id', authenticateToken, InventoryController.updateInventory);

// Update specific inventory item by inventory ID
router.put('/items/:id', authenticateToken, InventoryController.updateInventoryItem);

// Get low stock products
router.get('/low-stock', authenticateToken, InventoryController.getLowStockProducts);

// Get inventory reports and analytics
router.get('/reports', authenticateToken, InventoryController.getInventoryReport);

module.exports = router;
