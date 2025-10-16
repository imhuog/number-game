// models/SavedGame.js
const mongoose = require('mongoose');

const SavedGameSchema = new mongoose.Schema({
  // Loại game: 'solo' hoặc 'multiplayer'
  gameType: {
    type: String,
    enum: ['solo', 'multiplayer'],
    required: true
  },
  
  // SOLO GAME FIELDS
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.gameType === 'solo'; }
  },
  username: {
    type: String,
    required: function() { return this.gameType === 'solo'; }
  },
  
  // MULTIPLAYER GAME FIELDS
  roomId: {
    type: String,
    required: function() { return this.gameType === 'multiplayer'; }
  },
  players: [{
    id: String,
    username: String,
    score: Number,
    color: String,
    isCreator: Boolean,
    coins: Number
  }],
  creatorUsername: {
    type: String,
    required: function() { return this.gameType === 'multiplayer'; }
  },
  
  // GAME STATE (chung cho cả 2 mode)
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
  myColor: String,
  grid: [Number],
  positions: [{
    number: Number,
    x: Number,
    y: Number
  }],
  foundNumbers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  nextNumber: {
    type: Number,
    required: true
  },
  timeMs: {
    type: Number,
    default: 0
  },
  isDarkTheme: {
    type: Boolean,
    default: false
  },
  turn: String,
  
  // Metadata
  savedAt: {
    type: Date,
    default: Date.now
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
});

// Index để tìm kiếm nhanh
SavedGameSchema.index({ userId: 1, gameType: 1, isCompleted: 1 });
SavedGameSchema.index({ roomId: 1, gameType: 1 });
SavedGameSchema.index({ 'players.username': 1, gameType: 1, isCompleted: 1 });

module.exports = mongoose.model('SavedGame', SavedGameSchema);