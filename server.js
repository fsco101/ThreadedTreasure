const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import database connection
const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Import middleware
const { handleUploadError } = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API version prefix
const API_VERSION = '/api';

// Centralize API routes
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/users`, userRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/categories`, categoryRoutes);
app.use(`${API_VERSION}/orders`, orderRoutes);
app.use(`${API_VERSION}/upload`, uploadRoutes);

// Dashboard charts API
app.use(`${API_VERSION}/dashboard-charts`, require('./routes/dashboardCharts'));

// Add API documentation endpoint
app.get(`${API_VERSION}/docs`, (req, res) => {
    res.json({
        version: '1.0',
        endpoints: {
            auth: ['POST /login', 'POST /register', 'POST /logout'],
            users: ['GET /profile', 'PUT /profile', 'POST /avatar'],
            products: ['GET /', 'POST /', 'PUT /:id', 'DELETE /:id'],
            categories: ['GET /', 'POST /', 'PUT /:id', 'DELETE /:id'],
            orders: ['GET /', 'POST /', 'PUT /:id', 'GET /user/:userId'],
            upload: ['POST /image'],
            dashboard: ['GET /stats', 'GET /charts']
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ThreadedTreasure API is running',
    timestamp: new Date().toISOString()
  });
});

// Upload error handling middleware
app.use(handleUploadError);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

app.get('/shop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users', 'login.html'));
});

app.get('/logout', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users', 'logout.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users', 'register.html'));
});

// Remove the separate admin-login route since we're using unified login

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'admin-dashboard.html'));
});

app.get('/crud-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'crud-manager.html'));
});

app.get('/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'user-management.html'));
});

// Profile endpoint
app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// My orders endpoint
app.get('/my-orders', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'users', 'my-orders.html'));
});

// Admin routes
app.get('/products-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'products-manager-new.html'));
});

app.get('/categories-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'categories-manager.html'));
});

app.get('/orders-manager', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin', 'orders-manager.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 ThreadedTreasure API server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
      console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
