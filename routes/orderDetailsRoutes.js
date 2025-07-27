const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const OrderDetailsController = require('../controllers/OrderDetailsController');
const router = express.Router();

// Route to get order details (order history) for a user
router.get('/user/:userId', authenticateToken, OrderDetailsController.getOrderDetailsByUserId);

module.exports = router;
