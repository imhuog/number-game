// models/SoloLeaderboard.js
const mongoose = require('mongoose');

const leaderboardEntrySchema = new mongoose.Schema({
  username: { type: String, required: true },
  bestTime: { type: Number, required: true },
  rank: { type: Number, required: true }
}, { _id: false });

const soloLeaderboardSchema = new mongoose.Schema({
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    unique: true // unique: true đã tự tạo index rồi
  },
  entries: [leaderboardEntrySchema], // Top 100 players
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Không cần thêm index vì unique: true đã tạo index rồi

const SoloLeaderboard = mongoose.model('SoloLeaderboard', soloLeaderboardSchema);
module.exports = SoloLeaderboard;
