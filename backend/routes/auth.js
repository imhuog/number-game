const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ⭐ Import middleware verifyToken
const { verifyToken } = require('../middleware/auth');

// ==========================================
// PUBLIC ROUTES (không cần token)
// ==========================================

// Route Đăng ký người chơi mới
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: 'Tên người dùng đã tồn tại.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ 
      username, 
      password: hashedPassword,
      coins: 50
    });
    await newUser.save();
    res.status(201).json({ msg: 'Đăng ký thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Tên người dùng hoặc mật khẩu không đúng.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Tên người dùng hoặc mật khẩu không đúng.' });
    }

    const payload = { user: { id: user.id, username: user.username } };
    
    // ⭐ Token hết hạn sau 7 ngày
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token, 
        user: { 
          id: user.id,
          username: user.username, 
          coins: user.coins || 50
        } 
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PROTECTED ROUTES (cần token)
// ==========================================

// ⭐ Route verify token - kiểm tra token còn hợp lệ không
router.get('/verify', verifyToken, async (req, res) => {
  try {
    // req.user.id đã được set bởi middleware verifyToken
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tồn tại' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        coins: user.coins || 50,
        totalWins: user.totalWins || 0,
        totalLosses: user.totalLosses || 0,
        totalDraws: user.totalDraws || 0
      }
    });
  } catch (err) {
    console.error('Verify token error:', err.message);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// Route lấy thông tin user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }

    res.json({
      username: user.username,
      coins: user.coins || 50,
      totalWins: user.totalWins || 0,
      totalLosses: user.totalLosses || 0,
      totalDraws: user.totalDraws || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ Route lấy coins hiện tại của user
router.get('/coins', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('coins username');
    
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }

    res.json({
      username: user.username,
      coins: user.coins || 50
    });
  } catch (err) {
    console.error('Error fetching coins:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
