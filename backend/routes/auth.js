const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      coins: 50 // Đảm bảo mặc định có 50 xu
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
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token, 
        user: { 
          username: user.username, 
          coins: user.coins || 50 // Đảm bảo luôn trả về coins
        } 
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route lấy thông tin user (bao gồm coins hiện tại)
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'Không có token, truy cập bị từ chối' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }

    res.json({
      username: user.username,
      coins: user.coins || 50
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⭐ THÊM MỚI: Route lấy coins hiện tại của user
router.get('/coins', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ msg: 'Không có token, truy cập bị từ chối' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('coins username');
    
    if (!user) {
      return res.status(404).json({ msg: 'Không tìm thấy người dùng' });
    }

    res.json({
      coins: user.coins || 50,
      username: user.username
    });
  } catch (err) {
    console.error('Error fetching coins:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;