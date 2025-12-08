const express = require('express');
const router = express.Router();
const {
  searchUsers,
  updateUserProfile,
  uploadAvatar,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes here are protected
router.use(protect);

// @route   GET /api/users?search=
router.get('/', searchUsers);

// @route   PUT /api/users/profile
router.put('/profile', updateUserProfile);

// @route   POST /api/users/avatar
router.post('/avatar', upload.single('avatar'), uploadAvatar);

module.exports = router;
