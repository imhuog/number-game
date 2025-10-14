const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký người dùng
exports.register = async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Người dùng đã tồn tại' });
        }

        user = new User({
            username,
            password,
        });

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.status(201).json({ msg: 'Đăng ký thành công!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi server');
    }
};

// Đăng nhập người dùng
exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // So sánh mật khẩu đã nhập với mật khẩu đã mã hóa
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        // Tạo JWT token
        const payload = {
            user: {
                id: user.id,
            },
        };

        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
            console.error("JWT_SECRET is not defined in .env file");
            return res.status(500).send('Lỗi cấu hình máy chủ');
        }

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Lỗi server');
    }
};