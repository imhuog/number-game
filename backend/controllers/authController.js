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

        // Tạo JWT token - 7 NGÀY
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
            { expiresIn: '7d' }, // ⭐ ĐỔI THÀNH 7 NGÀY
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

// ⭐ THÊM MỚI: Verify token và trả về thông tin user
exports.verifyToken = async (req, res) => {
    try {
        // req.user đã được set bởi middleware verifyToken
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tồn tại' });
        }

        res.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                coins: user.coins,
                totalWins: user.totalWins,
                totalLosses: user.totalLosses,
                totalDraws: user.totalDraws
            }
        });
    } catch (err) {
        console.error('Verify token error:', err.message);
        res.status(500).json({ msg: 'Lỗi server' });
    }
};

// ⭐ THÊM MỚI: Lấy coins hiện tại
exports.getCoins = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('coins username');
        
        if (!user) {
            return res.status(404).json({ msg: 'Người dùng không tồn tại' });
        }

        res.json({ 
            username: user.username,
            coins: user.coins 
        });
    } catch (err) {
        console.error('Get coins error:', err.message);
        res.status(500).json({ msg: 'Lỗi server' });
    }
};
