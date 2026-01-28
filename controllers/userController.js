const User = require('../models/User');

// Helper function to escape special characters for regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// @desc    Search for users by name or email
// @route   GET /api/users?search=
// @access  Private
const searchUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: escapeRegExp(req.query.search), $options: 'i' } },
          { email: { $regex: escapeRegExp(req.query.search), $options: 'i' } },
        ],
      }
    : {};



  try {
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } }); // Exclude logged in user
    console.log('Users found:', users.length, users.map(u => ({ id: u._id, name: u.name, email: u.email })));
    res.json(users);
  } catch (error) {
    console.error('Search users server error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user profile (name, avatar)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  console.log('updateUserProfile req.body:', req.body);
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.avatar !== undefined && req.body.avatar !== null && req.body.avatar !== '') {
        user.avatar = req.body.avatar;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const avatarPath = `avatars/${req.file.filename}`;
        
        // Construct the full URL for the avatar
        const fullAvatarUrl = `${process.env.BACKEND_URL}/uploads/${avatarPath}`;

        // Save the full URL to the user's avatar field
        user.avatar = fullAvatarUrl;
        await user.save();

        res.json({ avatar: fullAvatarUrl });
    } catch (err) {
        console.error('Error in uploadAvatar:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
  searchUsers,
  updateUserProfile,
  uploadAvatar,
};
