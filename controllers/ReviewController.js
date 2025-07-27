const { promisePool } = require('../config/database');

class ReviewController {
  /**
   * Get all reviews for a specific product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProductReviews(req, res) {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get reviews with user information
      const [reviews] = await promisePool.execute(`
        SELECT 
          r.id,
          r.user_id,
          r.rating,
          r.title,
          r.comment,
          r.is_verified_purchase,
          r.helpful_count,
          r.created_at,
          u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ? AND r.is_approved = 1
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [productId, limit, offset]);

      // Get total count for pagination
      const [countResult] = await promisePool.execute(`
        SELECT COUNT(*) as total
        FROM reviews
        WHERE product_id = ? AND is_approved = 1
      `, [productId]);

      // Get average rating and rating distribution
      const [ratingStats] = await promisePool.execute(`
        SELECT 
          AVG(rating) as average_rating,
          COUNT(*) as total_reviews,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
        FROM reviews
        WHERE product_id = ? AND is_approved = 1
      `, [productId]);

      const totalCount = countResult[0].total;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          },
          stats: ratingStats[0] || {
            average_rating: 0,
            total_reviews: 0,
            five_stars: 0,
            four_stars: 0,
            three_stars: 0,
            two_stars: 0,
            one_star: 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews'
      });
    }
  }

  /**
   * Check if user can review a product (has purchased it)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkReviewEligibility(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;

      // Check if user has purchased this product
      const [purchaseCheck] = await promisePool.execute(`
        SELECT oi.id as order_item_id, o.status
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? AND o.user_id = ? AND o.status IN ('delivered', 'shipped')
        LIMIT 1
      `, [productId, userId]);

      // Check if user has already reviewed this product
      const [existingReview] = await promisePool.execute(`
        SELECT id, rating, title, comment, created_at
        FROM reviews
        WHERE product_id = ? AND user_id = ?
      `, [productId, userId]);

      const canReview = purchaseCheck.length > 0 && existingReview.length === 0;
      const hasPurchased = purchaseCheck.length > 0;
      const hasReviewed = existingReview.length > 0;

      res.json({
        success: true,
        data: {
          canReview,
          hasPurchased,
          hasReviewed,
          existingReview: hasReviewed ? existingReview[0] : null,
          orderItemId: purchaseCheck.length > 0 ? purchaseCheck[0].order_item_id : null
        }
      });
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check review eligibility'
      });
    }
  }

  /**
   * Create a new review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createReview(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.id;
      const { rating, title, comment } = req.body;

      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      if (!comment || comment.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Comment must be at least 10 characters long'
        });
      }

      // Check if user has purchased this product
      const [purchaseCheck] = await promisePool.execute(`
        SELECT oi.id as order_item_id
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ? AND o.user_id = ? AND o.status IN ('delivered', 'shipped')
        LIMIT 1
      `, [productId, userId]);

      if (purchaseCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only review products you have purchased'
        });
      }

      // Check if user has already reviewed this product
      const [existingReview] = await promisePool.execute(`
        SELECT id FROM reviews WHERE product_id = ? AND user_id = ?
      `, [productId, userId]);

      if (existingReview.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this product'
        });
      }

      const orderItemId = purchaseCheck[0].order_item_id;

      // Create the review
      const [result] = await promisePool.execute(`
        INSERT INTO reviews (
          user_id, product_id, order_item_id, rating, title, comment,
          is_verified_purchase, is_approved, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
      `, [userId, productId, orderItemId, rating, title || null, comment]);

      // Get the created review with user info
      const [newReview] = await promisePool.execute(`
        SELECT 
          r.id, r.user_id, r.rating, r.title, r.comment,
          r.is_verified_purchase, r.helpful_count, r.created_at,
          u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: newReview[0]
      });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create review'
      });
    }
  }

  /**
   * Update user's own review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.id;
      const { rating, title, comment } = req.body;

      // Validate input
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      if (!comment || comment.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Comment must be at least 10 characters long'
        });
      }

      // Check if review exists and belongs to user
      const [reviewCheck] = await promisePool.execute(`
        SELECT id FROM reviews WHERE id = ? AND user_id = ?
      `, [reviewId, userId]);

      if (reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you do not have permission to edit it'
        });
      }

      // Update the review
      await promisePool.execute(`
        UPDATE reviews 
        SET rating = ?, title = ?, comment = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `, [rating, title || null, comment, reviewId, userId]);

      // Get the updated review
      const [updatedReview] = await promisePool.execute(`
        SELECT 
          r.id, r.user_id, r.rating, r.title, r.comment,
          r.is_verified_purchase, r.helpful_count, r.created_at, r.updated_at,
          u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [reviewId]);

      res.json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview[0]
      });
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update review'
      });
    }
  }

  /**
   * Delete user's own review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteReview(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.user.id;

      // Check if review exists and belongs to user
      const [reviewCheck] = await promisePool.execute(`
        SELECT id FROM reviews WHERE id = ? AND user_id = ?
      `, [reviewId, userId]);

      if (reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found or you do not have permission to delete it'
        });
      }

      // Delete the review
      await promisePool.execute(`
        DELETE FROM reviews WHERE id = ? AND user_id = ?
      `, [reviewId, userId]);

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete review'
      });
    }
  }

  /**
   * Mark review as helpful
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async markHelpful(req, res) {
    try {
      const { reviewId } = req.params;

      // Check if review exists
      const [reviewCheck] = await promisePool.execute(`
        SELECT id FROM reviews WHERE id = ?
      `, [reviewId]);

      if (reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Increment helpful count
      await promisePool.execute(`
        UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?
      `, [reviewId]);

      // Get updated helpful count
      const [updatedReview] = await promisePool.execute(`
        SELECT helpful_count FROM reviews WHERE id = ?
      `, [reviewId]);

      res.json({
        success: true,
        message: 'Review marked as helpful',
        data: {
          helpful_count: updatedReview[0].helpful_count
        }
      });
    } catch (error) {
      console.error('Error marking review as helpful:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark review as helpful'
      });
    }
  }

  /**
   * Get user's own reviews
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserReviews(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Get user's reviews with product information
      const [reviews] = await promisePool.execute(`
        SELECT 
          r.id, r.rating, r.title, r.comment, r.helpful_count,
          r.created_at, r.updated_at,
          p.id as product_id, p.name as product_name, p.main_image as product_image
        FROM reviews r
        LEFT JOIN products p ON r.product_id = p.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, limit, offset]);

      // Get total count
      const [countResult] = await promisePool.execute(`
        SELECT COUNT(*) as total FROM reviews WHERE user_id = ?
      `, [userId]);

      const totalCount = countResult[0].total;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user reviews'
      });
    }
  }

  /**
   * Admin: Get all reviews with moderation options
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllReviews(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status; // 'approved', 'pending', 'all'

      let whereClause = '';
      let queryParams = [];

      if (status === 'approved') {
        whereClause = 'WHERE r.is_approved = 1';
      } else if (status === 'pending') {
        whereClause = 'WHERE r.is_approved = 0';
      }

      // Get reviews with user and product information
      const [reviews] = await promisePool.execute(`
        SELECT 
          r.id, r.user_id, r.product_id, r.rating, r.title, r.comment,
          r.is_verified_purchase, r.is_approved, r.helpful_count,
          r.created_at, r.updated_at,
          u.name as user_name, u.email as user_email,
          p.name as product_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN products p ON r.product_id = p.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      // Get total count
      const [countResult] = await promisePool.execute(`
        SELECT COUNT(*) as total FROM reviews r ${whereClause}
      `, queryParams);

      const totalCount = countResult[0].total;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all reviews:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews'
      });
    }
  }

  /**
   * Admin: Approve or reject a review
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async moderateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { action } = req.body; // 'approve' or 'reject'

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "approve" or "reject"'
        });
      }

      const isApproved = action === 'approve' ? 1 : 0;

      const [result] = await promisePool.execute(`
        UPDATE reviews SET is_approved = ?, updated_at = NOW() WHERE id = ?
      `, [isApproved, reviewId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      res.json({
        success: true,
        message: `Review ${action}d successfully`
      });
    } catch (error) {
      console.error('Error moderating review:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to moderate review'
      });
    }
  }
}

module.exports = ReviewController;
