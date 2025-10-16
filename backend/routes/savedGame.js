// routes/savedGame.js
const express = require('express');
const router = express.Router();
const SavedGame = require('../models/SavedGame');
const { verifyToken } = require('../middleware/auth');

// ==================== SOLO GAME ====================

// POST /api/saved-game/save-solo - Lưu solo game
router.post('/save-solo', verifyToken, async (req, res) => {
  try {
    const {
      difficulty,
      mode,
      myColor,
      grid,
      positions,
      foundNumbers,
      nextNumber,
      timeMs,
      isDarkTheme
    } = req.body;

    const userId = req.user.id;
    const username = req.user.username;

    // Xóa saved game cũ nếu có
    await SavedGame.deleteMany({ 
      userId, 
      gameType: 'solo',
      isCompleted: false 
    });

    // Tạo saved game mới
    const savedGame = new SavedGame({
      gameType: 'solo',
      userId,
      username,
      difficulty,
      mode,
      myColor,
      grid,
      positions,
      foundNumbers: new Map(Object.entries(foundNumbers)),
      nextNumber,
      timeMs,
      isDarkTheme
    });

    await savedGame.save();

    res.json({ 
      success: true, 
      msg: 'Đã lưu game thành công!',
      savedGameId: savedGame._id
    });
  } catch (err) {
    console.error('Save solo game error:', err);
    res.status(500).json({ msg: 'Lỗi khi lưu game' });
  }
});

// GET /api/saved-game/saved-solo - Lấy solo game đã lưu
router.get('/saved-solo', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const savedGame = await SavedGame.findOne({
      userId,
      gameType: 'solo',
      isCompleted: false
    }).sort({ savedAt: -1 });

    if (!savedGame) {
      return res.json({ hasSavedGame: false });
    }

    // Convert Map to Object
    const foundNumbersObj = {};
    if (savedGame.foundNumbers) {
      savedGame.foundNumbers.forEach((value, key) => {
        foundNumbersObj[key] = value;
      });
    }

    res.json({
      hasSavedGame: true,
      savedGame: {
        difficulty: savedGame.difficulty,
        mode: savedGame.mode,
        myColor: savedGame.myColor,
        grid: savedGame.grid,
        positions: savedGame.positions,
        foundNumbers: foundNumbersObj,
        nextNumber: savedGame.nextNumber,
        timeMs: savedGame.timeMs,
        isDarkTheme: savedGame.isDarkTheme,
        savedAt: savedGame.savedAt
      }
    });
  } catch (err) {
    console.error('Get saved solo game error:', err);
    res.status(500).json({ msg: 'Lỗi khi lấy game đã lưu' });
  }
});

// DELETE /api/saved-game/saved-solo - Xóa solo game đã lưu
router.delete('/saved-solo', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await SavedGame.deleteMany({
      userId,
      gameType: 'solo',
      isCompleted: false
    });

    res.json({ success: true, msg: 'Đã xóa game đã lưu' });
  } catch (err) {
    console.error('Delete saved solo game error:', err);
    res.status(500).json({ msg: 'Lỗi khi xóa game' });
  }
});

// ==================== MULTIPLAYER GAME ====================

// POST /api/saved-game/save-multiplayer - Lưu multiplayer game
router.post('/save-multiplayer', verifyToken, async (req, res) => {
  try {
    const {
      roomId,
      players,
      difficulty,
      mode,
      grid,
      positions,
      foundNumbers,
      nextNumber,
      isDarkTheme,
      turn
    } = req.body;

    const username = req.user.username;
    
    // Tìm creator
    const creator = players.find(p => p.isCreator);
    if (!creator) {
      return res.status(400).json({ msg: 'Không tìm thấy người tạo phòng' });
    }

    // Xóa saved game cũ của room này
    await SavedGame.deleteMany({ 
      roomId, 
      gameType: 'multiplayer',
      isCompleted: false 
    });

    // Tạo saved game mới
    const savedGame = new SavedGame({
      gameType: 'multiplayer',
      roomId,
      players,
      creatorUsername: creator.username,
      difficulty,
      mode,
      grid,
      positions,
      foundNumbers: new Map(Object.entries(foundNumbers)),
      nextNumber,
      isDarkTheme,
      turn
    });

    await savedGame.save();

    res.json({ 
      success: true, 
      msg: 'Đã lưu game thành công!',
      savedGameId: savedGame._id
    });
  } catch (err) {
    console.error('Save multiplayer game error:', err);
    res.status(500).json({ msg: 'Lỗi khi lưu game' });
  }
});

// GET /api/saved-game/saved-multiplayer - Kiểm tra có multiplayer game đã lưu
router.get('/saved-multiplayer', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;

    const savedGame = await SavedGame.findOne({
      'players.username': username,
      gameType: 'multiplayer',
      isCompleted: false
    }).sort({ savedAt: -1 });

    if (!savedGame) {
      return res.json({ hasSavedGame: false });
    }

    // Kiểm tra user có phải là player trong game này không
    const isPlayer = savedGame.players.some(p => p.username === username);
    if (!isPlayer) {
      return res.json({ hasSavedGame: false });
    }

    res.json({
      hasSavedGame: true,
      roomId: savedGame.roomId,
      creatorUsername: savedGame.creatorUsername,
      players: savedGame.players,
      difficulty: savedGame.difficulty,
      mode: savedGame.mode,
      savedAt: savedGame.savedAt
    });
  } catch (err) {
    console.error('Get saved multiplayer game error:', err);
    res.status(500).json({ msg: 'Lỗi khi lấy game đã lưu' });
  }
});

// POST /api/saved-game/resume-multiplayer - Load lại game state từ DB
router.post('/resume-multiplayer', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.body;
    const username = req.user.username;

    const savedGame = await SavedGame.findOne({
      roomId,
      gameType: 'multiplayer',
      isCompleted: false
    });

    if (!savedGame) {
      return res.status(404).json({ msg: 'Không tìm thấy game đã lưu' });
    }

    // Kiểm tra user có phải là player không
    const isPlayer = savedGame.players.some(p => p.username === username);
    if (!isPlayer) {
      return res.status(403).json({ msg: 'Bạn không phải là người chơi trong game này' });
    }

    // Convert Map to Object
    const foundNumbersObj = {};
    if (savedGame.foundNumbers) {
      savedGame.foundNumbers.forEach((value, key) => {
        foundNumbersObj[key] = value;
      });
    }

    res.json({
      success: true,
      savedGame: {
        roomId: savedGame.roomId,
        players: savedGame.players,
        difficulty: savedGame.difficulty,
        mode: savedGame.mode,
        grid: savedGame.grid,
        positions: savedGame.positions,
        foundNumbers: foundNumbersObj,
        nextNumber: savedGame.nextNumber,
        isDarkTheme: savedGame.isDarkTheme,
        turn: savedGame.turn,
        creatorUsername: savedGame.creatorUsername
      }
    });
  } catch (err) {
    console.error('Resume multiplayer game error:', err);
    res.status(500).json({ msg: 'Lỗi khi load game' });
  }
});

// DELETE /api/saved-game/saved-multiplayer/:roomId - Xóa multiplayer game
router.delete('/saved-multiplayer/:roomId', verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    await SavedGame.deleteMany({
      roomId,
      gameType: 'multiplayer',
      isCompleted: false
    });

    res.json({ success: true, msg: 'Đã xóa game đã lưu' });
  } catch (err) {
    console.error('Delete saved multiplayer game error:', err);
    res.status(500).json({ msg: 'Lỗi khi xóa game' });
  }
});

// POST /api/saved-game/complete - Đánh dấu game hoàn thành
router.post('/complete', verifyToken, async (req, res) => {
  try {
    const { gameType, roomId } = req.body;
    const userId = req.user.id;

    if (gameType === 'solo') {
      await SavedGame.updateMany(
        { userId, gameType: 'solo', isCompleted: false },
        { isCompleted: true }
      );
    } else if (gameType === 'multiplayer' && roomId) {
      await SavedGame.updateMany(
        { roomId, gameType: 'multiplayer', isCompleted: false },
        { isCompleted: true }
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Complete game error:', err);
    res.status(500).json({ msg: 'Lỗi khi đánh dấu game hoàn thành' });
  }
});

module.exports = router;