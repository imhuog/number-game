// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  coins: {
    type: Number,
    default: 50, // Mặc định mỗi người chơi có 50 xu.
  },
  
  // ===== SOLO GAME - Tách 3 difficulty =====
  bestSoloTimeEasy: {
    type: Number,
    default: null,
  },
  bestSoloTimeMedium: {
    type: Number,
    default: null,
  },
  bestSoloTimeHard: {
    type: Number,
    default: null,
  },
  
  // ===== MULTIPLAYER STATS =====
  totalWins: {
    type: Number,
    default: 0
  },
  totalLosses: {
    type: Number,
    default: 0
  },
  totalDraws: {
    type: Number,
    default: 0
  }
});

const User = mongoose.model('User', userSchema);
module.exports = User;