// Dashboard Charts Data API
const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');

// Use the controller for GET /api/dashboard-charts
router.get('/', DashboardController.getDashboardCharts);

module.exports = router;
