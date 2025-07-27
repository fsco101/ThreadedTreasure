const express = require('express');
const router = express.Router();
const ReviewController = require('../controllers/ReviewController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Public routes - anyone can view reviews
router.get('/products/:productId', ReviewController.getProductReviews);

// Protected routes - require authentication
router.get('/eligibility/:productId', authenticateToken, ReviewController.checkReviewEligibility);
router.post('/products/:productId', authenticateToken, ReviewController.createReview);
router.put('/:reviewId', authenticateToken, ReviewController.updateReview);
router.delete('/:reviewId', authenticateToken, ReviewController.deleteReview);
router.post('/:reviewId/helpful', ReviewController.markHelpful); // Public - no auth required
router.get('/my-reviews', authenticateToken, ReviewController.getUserReviews);

// Admin routes
router.get('/admin/all', authenticateToken, authorize(['admin']), ReviewController.getAllReviews);
router.patch('/admin/:reviewId/moderate', authenticateToken, authorize(['admin']), ReviewController.moderateReview);

module.exports = router;
