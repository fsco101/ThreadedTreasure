const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadUserImage } = require('../middleware/upload');

// Public routes
router.post('/register', UserController.createUser);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, (req, res) => {
  // Get current user profile
  req.params.id = req.user.id;
  UserController.getUserById(req, res);
});

router.put('/profile', authenticateToken, (req, res) => {
  // Update current user profile
  req.params.id = req.user.id;
  UserController.updateUser(req, res);
});

router.put('/change-password', authenticateToken, UserController.changePassword);
router.post('/avatar', authenticateToken, uploadUserImage, UserController.uploadAvatar);

// Admin only routes
router.get('/', authenticateToken, authorize(['admin']), UserController.getAllUsers);
router.get('/search', authenticateToken, authorize(['admin']), UserController.searchUsers);
router.get('/:id', authenticateToken, authorize(['admin']), UserController.getUserById);
router.put('/:id', authenticateToken, authorize(['admin']), UserController.updateUser);
router.delete('/:id', authenticateToken, authorize(['admin']), UserController.deleteUser);

module.exports = router;
