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
    unique: true
  },
  entries: [leaderboardEntrySchema], // Top 100 players
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index để query nhanh
soloLeaderboardSchema.index({ difficulty: 1 });

const SoloLeaderboard = mongoose.model('SoloLeaderboard', soloLeaderboardSchema);
module.exports = SoloLeaderboard;
