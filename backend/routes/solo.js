// routes/solo.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SoloLeaderboard = require('../models/SoloLeaderboard');
const { verifyToken } = require('../middleware/auth');

// Helper: Update leaderboard cache cho 1 difficulty
async function updateLeaderboardCache(difficulty) {
  const fieldMap = {
    'easy': 'bestSoloTimeEasy',
    'medium': 'bestSoloTimeMedium',
    'hard': 'bestSoloTimeHard'
  };
  
  const field = fieldMap[difficulty];
  const filter = { [field]: { $ne: null } };
  
  // Query top 100 từ User
  const topUsers = await User.find(filter)
    .select(`username ${field}`)
    .sort({ [field]: 1 })
    .limit(100)
    .lean();
  
  // Tạo entries với rank
  const entries = topUsers.map((u, idx) => ({
    username: u.username,
    bestTime: u[field],
    rank: idx + 1
  }));
  
  // Upsert vào cache
  await SoloLeaderboard.findOneAndUpdate(
    { difficulty },
    { 
      difficulty,
      entries,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
  
  return entries;
}

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
      
      // 🔥 UPDATE CACHE khi có record mới
      try {
        await updateLeaderboardCache(difficulty);
        console.log(`✅ Cache updated for ${difficulty}`);
      } catch (cacheErr) {
        console.error('⚠️ Cache update failed:', cacheErr);
        // Không throw error, vẫn response success
      }
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
// Đọc từ cache, fallback về real-time nếu cache chưa có
router.get('/leaderboard', async (req, res) => {
  try {
    const difficulties = ['easy', 'medium', 'hard'];
    const leaderboards = {};
    
    for (const diff of difficulties) {
      // Đọc từ cache
      let cached = await SoloLeaderboard.findOne({ difficulty: diff }).lean();
      
      if (cached && cached.entries && cached.entries.length > 0) {
        // Có cache -> dùng luôn
        leaderboards[diff] = cached.entries.map(e => ({
          username: e.username,
          bestTime: e.bestTime
        }));
      } else {
        // Chưa có cache -> tính real-time và lưu cache
        console.log(`⚠️ No cache for ${diff}, building...`);
        try {
          const entries = await updateLeaderboardCache(diff);
          leaderboards[diff] = entries.map(e => ({
            username: e.username,
            bestTime: e.bestTime
          }));
        } catch (err) {
          console.error(`Error building cache for ${diff}:`, err);
          leaderboards[diff] = [];
        }
      }
    }

    res.json({ leaderboards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET /api/solo/leaderboard/refresh
// Force refresh tất cả cache (dùng thay cho init script)
router.get('/leaderboard/refresh', verifyToken, async (req, res) => {
  try {
    const difficulties = ['easy', 'medium', 'hard'];
    const results = {};
    
    for (const diff of difficulties) {
      const entries = await updateLeaderboardCache(diff);
      results[diff] = entries.length;
    }
    
    res.json({ 
      msg: 'Cache refreshed successfully',
      updated: results
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;
