// models/MatchHistory.js
const mongoose = require('mongoose');

const matchHistorySchema = new mongoose.Schema({
  player1: {
    type: String,
    required: true,
    index: true
  },
  player2: {
    type: String,
    required: true,
    index: true
  },
  winner: {
    type: String,
    required: true
  },
  player1Score: {
    type: Number,
    default: 0
  },
  player2Score: {
    type: Number,
    default: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  mode: {
    type: String,
    enum: ['shuffle', 'keep'],
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

// Index để query nhanh head-to-head
matchHistorySchema.index({ player1: 1, player2: 1 });
matchHistorySchema.index({ player2: 1, player1: 1 });

const MatchHistory = mongoose.model('MatchHistory', matchHistorySchema);
module.exports = MatchHistory;