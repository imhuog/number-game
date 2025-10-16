// models/SoloStreak.js
const mongoose = require('mongoose');

const soloStreakSchema = new mongoose.Schema({
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true,
    unique: true // Mỗi difficulty chỉ có 1 document
  },
  currentTop1: {
    type: String, // Username của top1 hiện tại
    default: null
  },
  streakDays: {
    type: Number, // Số ngày liên tiếp giữ top1
    default: 0
  },
  lastCheckDate: {
    type: Date, // Lần check cuối cùng
    default: null
  },
  lastAwardedDate: {
    type: Date, // Lần award cuối cùng (tránh award lặp)
    default: null
  }
});

const SoloStreak = mongoose.model('SoloStreak', soloStreakSchema);
module.exports = SoloStreak;
