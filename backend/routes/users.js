const express = require('express');
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// GET /api/users — list all users (for assigning tasks/members)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).select('name email role createdAt');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/:id/role — change role (admin only)
router.put('/:id/role', restrictTo('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/profile — get own profile
router.get('/profile', async (req, res) => {
  res.json({ success: true, data: req.user });
});

// PUT /api/users/profile — update own profile
router.put('/profile', async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
