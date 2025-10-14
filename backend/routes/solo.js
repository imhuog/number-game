// routes/solo.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// Middleware verify token (small helper)
const verifyToken = (req, res, next) => {
try {
const token = req.header('Authorization')?.replace('Bearer ', '');
if (!token) return res.status(401).json({ msg: 'Không có token' });
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded.user;
next();
} catch (err) {
console.error('verifyToken error', err);
res.status(401).json({ msg: 'Token không hợp lệ' });
}
};


// POST /api/solo/finish
router.post('/finish', verifyToken, async (req, res) => {
try {
const { timeMs } = req.body;
if (typeof timeMs !== 'number' || timeMs <= 0) {
return res.status(400).json({ msg: 'timeMs không hợp lệ' });
}


const user = await User.findById(req.user.id);
if (!user) return res.status(404).json({ msg: 'Người dùng không tồn tại' });


let updated = false;
if (user.bestSoloTime == null || timeMs < user.bestSoloTime) {
user.bestSoloTime = timeMs;
updated = true;
await user.save();
}


res.json({
username: user.username,
bestSoloTime: user.bestSoloTime,
updated
});
} catch (err) {
console.error(err);
res.status(500).json({ msg: 'Lỗi server' });
}
});


// GET /api/solo/leaderboard
router.get('/leaderboard', async (req, res) => {
try {
const top = await User.find({ bestSoloTime: { $ne: null } })
.select('username bestSoloTime -_id')
.sort({ bestSoloTime: 1 })
.limit(200)
.lean();


res.json({ leaderboard: top });
} catch (err) {
console.error(err);
res.status(500).json({ msg: 'Lỗi server' });
}
});


module.exports = router;