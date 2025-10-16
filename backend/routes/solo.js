// routes/solo.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// POST /api/solo/finish
router.post('/finish', verifyToken, async (req, res) => {
  try {
    const { timeMs, difficulty } = req.body;
    
    // Validate timeMs
    if (typeof timeMs !== 'number' || timeMs <= 0) {
      return res.status(400).json({ msg: 'timeMs không hợp lệ' });
    }
    
    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ msg: 'difficulty không hợp lệ (easy/medium/hard)' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tồn tại' });
    }

    // Map difficulty to field name
    const fieldMap = {
      'easy': 'bestSoloTimeEasy',
      'medium': 'bestSoloTimeMedium',
      'hard': 'bestSoloTimeHard'
    };
    
    const field = fieldMap[difficulty];
    let updated = false;
    
    // Update nếu chưa có hoặc time mới tốt hơn
    if (user[field] == null || timeMs < user[field]) {
      user[field] = timeMs;
      updated = true;
      await user.save();
    }

    res.json({
      username: user.username,
      difficulty,
      bestTime: user[field],
      updated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET /api/solo/leaderboard
// Trả về top cho cả 3 difficulty
router.get('/leaderboard', async (req, res) => {
  try {
    const difficulties = ['easy', 'medium', 'hard'];
    const leaderboards = {};
    
    for (const diff of difficulties) {
      const fieldMap = {
        'easy': 'bestSoloTimeEasy',
        'medium': 'bestSoloTimeMedium',
        'hard': 'bestSoloTimeHard'
      };
      
      const field = fieldMap[diff];
      const filter = { [field]: { $ne: null } };
      
      const top = await User.find(filter)
        .select(`username ${field} -_id`)
        .sort({ [field]: 1 })
        .limit(100)
        .lean();
      
      // Rename field thành bestTime để frontend dễ xử lý
      leaderboards[diff] = top.map(u => ({
        username: u.username,
        bestTime: u[field]
      }));
    }

    res.json({ leaderboards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;