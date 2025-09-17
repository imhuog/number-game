const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Route Đăng ký người chơi mới
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Kiểm tra xem username đã tồn tại chưa
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ msg: 'Tên người dùng đã tồn tại.' });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo người dùng mới và lưu vào DB
        const newUser = new User({
            username,
            password: hashedPassword,
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
        // Tìm người dùng theo tên
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Tên người dùng hoặc mật khẩu không đúng.' });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Tên người dùng hoặc mật khẩu không đúng.' });
        }

        // Tạo và gửi JWT token
        const payload = {
            user: {
                id: user.id,
                username: user.username,
            },
        };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { username: user.username, coins: user.coins } });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
