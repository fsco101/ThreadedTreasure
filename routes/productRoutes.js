const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadProductImage, uploadProductImages } = require('../middleware/upload');
const mysql = require('mysql2/promise');


const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'threadedtreasure'
};
// Public routes
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/:id', ProductController.getProductById);

// Protected routes (admin only)
router.post('/', authenticateToken, authorize(['admin']), uploadProductImages, ProductController.createProduct);
router.put('/:id', authenticateToken, authorize(['admin']), uploadProductImages, ProductController.updateProduct);
router.delete('/:id', authenticateToken, authorize(['admin']), ProductController.deleteProduct);

// New route for getting products with main image
router.get('/api/products', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [products] = await connection.execute(`
            SELECT 
                p.*,
                (
                    SELECT image_path 
                    FROM product_images 
                    WHERE product_id = p.id 
                    ORDER BY is_main DESC, id ASC LIMIT 1
                ) AS main_image,
                (
                    SELECT GROUP_CONCAT(image_path) 
                    FROM product_images 
                    WHERE product_id = p.id
                ) AS all_images
            FROM products p
        `);

        // Convert all_images to array and build images array for each product
        const productsWithImages = products.map(prod => ({
            ...prod,
            images: prod.all_images ? prod.all_images.split(',').map(img => ({ image_path: img })) : []
        }));

        res.json({ success: true, data: productsWithImages });
    } catch (error) {
        res.json({ success: false, message: error.message });
    } finally {
        await connection.end();
    }
});

module.exports = router;
