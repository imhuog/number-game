// routes/multiplayer.js
const express = require('express');
const router = express.Router();
const MatchHistory = require('../models/MatchHistory');

// GET /api/multiplayer/head-to-head?player1=A&player2=B
router.get('/head-to-head', async (req, res) => {
  try {
    const { player1, player2 } = req.query;
    
    if (!player1 || !player2) {
      return res.status(400).json({ msg: 'Cần cung cấp player1 và player2' });
    }

    // Tìm tất cả trận đấu giữa 2 người này
    const matches = await MatchHistory.find({
      $or: [
        { player1: player1, player2: player2 },
        { player1: player2, player2: player1 }
      ]
    }).lean();

    let player1Wins = 0;
    let player2Wins = 0;
    let draws = 0;

    matches.forEach(match => {
      if (match.winner === 'draw') {
        draws++;
      } else if (match.winner === player1) {
        player1Wins++;
      } else if (match.winner === player2) {
        player2Wins++;
      }
    });

    res.json({
      player1,
      player2,
      player1Wins,
      player2Wins,
      draws,
      totalMatches: matches.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

// GET /api/multiplayer/leaderboard
// Trả về danh sách các cặp đấu phổ biến nhất
router.get('/leaderboard', async (req, res) => {
  try {
    const matches = await MatchHistory.find().lean();
    
    // Tạo map các cặp đấu
    const pairMap = {};
    
    matches.forEach(match => {
      // Tạo key duy nhất cho cặp (sort alphabet để A-B = B-A)
      const players = [match.player1, match.player2].sort();
      const key = `${players[0]}_vs_${players[1]}`;
      
      if (!pairMap[key]) {
        pairMap[key] = {
          player1: players[0],
          player2: players[1],
          player1Wins: 0,
          player2Wins: 0,
          draws: 0,
          totalMatches: 0
        };
      }
      
      pairMap[key].totalMatches++;
      
      if (match.winner === 'draw') {
        pairMap[key].draws++;
      } else if (match.winner === players[0]) {
        pairMap[key].player1Wins++;
      } else if (match.winner === players[1]) {
        pairMap[key].player2Wins++;
      }
    });
    
    // Convert sang array và sort theo số trận
    const leaderboard = Object.values(pairMap)
      .sort((a, b) => b.totalMatches - a.totalMatches)
      .slice(0, 50); // Top 50 cặp
    
    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Lỗi server' });
  }
});

module.exports = router;