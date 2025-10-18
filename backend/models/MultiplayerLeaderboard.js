// models/MultiplayerLeaderboard.js
const mongoose = require('mongoose');

const pairStatsSchema = new mongoose.Schema({
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  player1Wins: { type: Number, default: 0 },
  player2Wins: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  totalMatches: { type: Number, default: 0 },
  lastMatchDate: { type: Date, default: Date.now }
});

// Compound index để tìm pair nhanh (bất kể thứ tự)
pairStatsSchema.index({ player1: 1, player2: 1 }, { unique: true });

const MultiplayerLeaderboard = mongoose.model('MultiplayerLeaderboard', pairStatsSchema);
module.exports = MultiplayerLeaderboard;
