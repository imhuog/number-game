const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const User = require('./models/User');
const MatchHistory = require('./models/MatchHistory');
const SoloStreak = require('./models/SoloStreak');

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://number-game-taupe.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.options("*", cors()); // ✅ xử lý preflight request cho tất cả route

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully!');
    
    // Initialize SoloStreak documents
    await initializeSoloStreaks();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

const initializeSoloStreaks = async () => {
  const difficulties = ['easy', 'medium', 'hard'];
  for (const diff of difficulties) {
    const exists = await SoloStreak.findOne({ difficulty: diff });
    if (!exists) {
      await SoloStreak.create({ difficulty: diff });
      console.log(`Initialized SoloStreak for ${diff}`);
    }
  }
};

connectDB();

// CRON JOB - Chạy mỗi ngày lúc 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily streak check...');
  await checkAndAwardStreaks();
});

const checkAndAwardStreaks = async () => {
  try {
    const difficulties = ['easy', 'medium', 'hard'];
    
    for (const diff of difficulties) {
      const fieldMap = {
        'easy': 'bestSoloTimeEasy',
        'medium': 'bestSoloTimeMedium',
        'hard': 'bestSoloTimeHard'
      };
      
      const field = fieldMap[diff];
      
      // Tìm top1 hiện tại
      const top1User = await User.findOne({ [field]: { $ne: null } })
        .sort({ [field]: 1 })
        .select('username coins')
        .lean();
      
      if (!top1User) continue;
      
      const streakDoc = await SoloStreak.findOne({ difficulty: diff });
      
      if (!streakDoc) continue;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Nếu chưa check hôm nay
      if (!streakDoc.lastCheckDate || streakDoc.lastCheckDate < today) {
        if (streakDoc.currentTop1 === top1User.username) {
          // User giữ top1
          streakDoc.streakDays += 1;
          
          // Đủ 7 ngày và chưa award trong streak này
          if (streakDoc.streakDays === 7 && 
              (!streakDoc.lastAwardedDate || streakDoc.lastAwardedDate < today)) {
            
            // Award 50 xu
            await User.updateOne(
              { username: top1User.username },
              { $inc: { coins: 50 } }
            );
            
            streakDoc.lastAwardedDate = today;
            console.log(`✅ Awarded 50 coins to ${top1User.username} for ${diff} 7-day streak!`);
          }
        } else {
          // Top1 thay đổi, reset streak
          streakDoc.currentTop1 = top1User.username;
          streakDoc.streakDays = 1;
          streakDoc.lastAwardedDate = null;
        }
        
        streakDoc.lastCheckDate = today;
        await streakDoc.save();
      }
    }
  } catch (err) {
    console.error('Error in checkAndAwardStreaks:', err);
  }
};

// ROUTES
const authRoutes = require('./routes/auth');
const soloRoutes = require('./routes/solo');
const savedGameRoutes = require('./routes/savedGame');
const multiplayerRoutes = require('./routes/multiplayer');

app.use('/api/auth', authRoutes);
app.use('/api/solo', soloRoutes);
app.use('/api/saved-game', savedGameRoutes);
app.use('/api/multiplayer', multiplayerRoutes);

// GAME STATE
let rooms = {};
let resumeSessions = {};

const generateGridByDifficulty = (difficulty) => {
  let maxNumber;
  switch (difficulty) {
    case 'easy': maxNumber = 50; break;
    case 'medium': maxNumber = 100; break;
    case 'hard': maxNumber = 150; break;
    default: maxNumber = 100;
  }
  return Array.from({ length: maxNumber }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
};

// Helper: Update coins with auto-reset
const updateUserCoins = async (username, change) => {
  const user = await User.findOne({ username });
  if (!user) return null;
  
  let newCoins = user.coins + change;
  
  // Nếu về 0 hoặc âm, reset về 50
  if (newCoins <= 0) {
    newCoins = 50;
  }
  
  user.coins = newCoins;
  await user.save();
  
  return { username, change, newTotal: newCoins };
};

// Helper: Save match result
const saveMatchResult = async (room, winner) => {
  try {
    const [player1, player2] = room.players;
    
    await MatchHistory.create({
      player1: player1.username,
      player2: player2.username,
      winner: winner === 'draw' ? 'draw' : winner,
      player1Score: player1.score,
      player2Score: player2.score,
      difficulty: room.difficulty,
      mode: room.mode
    });
    
    // Update user stats
    if (winner === 'draw') {
      await User.updateOne({ username: player1.username }, { $inc: { totalDraws: 1 } });
      await User.updateOne({ username: player2.username }, { $inc: { totalDraws: 1 } });
    } else {
      const loser = winner === player1.username ? player2.username : player1.username;
      await User.updateOne({ username: winner }, { $inc: { totalWins: 1 } });
      await User.updateOne({ username: loser }, { $inc: { totalLosses: 1 } });
    }
  } catch (err) {
    console.error('Error saving match result:', err);
  }
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('create_room', async (data) => {
    const { username, difficulty, mode, color } = data;
    const roomId = uuidv4().substring(0, 6);
    
    // Lấy coins từ DB
    const user = await User.findOne({ username }).select('coins');
    const coins = user ? user.coins : 50;
    
    const newPlayer = { 
      id: socket.id, 
      username, 
      score: 0, 
      color, 
      isCreator: true,
      coins 
    };
    
    const grid = generateGridByDifficulty(difficulty);
    
    rooms[roomId] = {
      roomId,
      players: [newPlayer],
      difficulty,
      mode,
      isDarkTheme: false,
      gameStarted: false,
      grid,
      nextNumber: 1,
      message: 'Phòng của bạn đã sẵn sàng. Đang chờ người chơi khác...',
      turn: socket.id,
      foundNumbers: {}
    };
    
    socket.join(roomId);
    io.to(roomId).emit('room_state', rooms[roomId]);
  });
  
  socket.on('join_room', async (data) => {
    const { roomId, username, color } = data;
    const room = rooms[roomId];
    
    if (!room) {
      socket.emit('error', 'Phòng không tồn tại.');
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', 'Phòng đã đầy.');
      return;
    }
    
    const existingPlayer = room.players.find(p => p.username === username);
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      socket.join(roomId);
      io.to(roomId).emit('room_state', room);
      return;
    }
    
    // Lấy coins từ DB
    const user = await User.findOne({ username }).select('coins');
    const coins = user ? user.coins : 50;
    
    const newPlayer = { 
      id: socket.id, 
      username, 
      score: 0, 
      color, 
      isCreator: false,
      coins 
    };
    
    room.players.push(newPlayer);
    socket.join(roomId);
    room.message = `Người chơi ${username} đã tham gia.`;
    io.to(roomId).emit('room_state', room);
  });
  
  // RESUME MULTIPLAYER
  socket.on('resume_room', (data) => {
    const { roomId, username, color } = data;
    
    if (!resumeSessions[roomId]) {
      resumeSessions[roomId] = {
        roomId,
        players: [],
        readyPlayers: [],
        timeout: null
      };
    }
    
    const session = resumeSessions[roomId];
    const existingPlayer = session.players.find(p => p.username === username);
    
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.color = color;
    } else {
      session.players.push({ id: socket.id, username, color });
    }
    
    if (!session.readyPlayers.includes(username)) {
      session.readyPlayers.push(username);
    }
    
    socket.join(roomId);
    
    if (session.timeout) clearTimeout(session.timeout);
    
    io.to(roomId).emit('resume_waiting', {
      roomId,
      readyPlayers: session.readyPlayers,
      totalNeeded: 2,
      message: `Đang chờ người chơi... (${session.readyPlayers.length}/2)`
    });
    
    if (session.readyPlayers.length >= 2) {
      io.to(roomId).emit('resume_ready', {
        roomId,
        players: session.players,
        readyPlayers: session.readyPlayers,
        message: 'Cả 2 người chơi đã sẵn sàng! Chủ phòng có thể bắt đầu.'
      });
    } else {
      session.timeout = setTimeout(() => {
        io.to(roomId).emit('resume_timeout', {
          message: 'Hết thời gian chờ. Người chơi khác chưa tham gia.'
        });
        delete resumeSessions[roomId];
      }, 60000);
    }
  });
  
  socket.on('start_resume_game', async (data) => {
    const { roomId, savedGameState } = data;
    const session = resumeSessions[roomId];
    
    if (!session || session.readyPlayers.length < 2) {
      socket.emit('error', 'Chưa đủ người chơi để bắt đầu!');
      return;
    }
    
    // Load coins từ DB cho mỗi player
    for (let p of savedGameState.players) {
      const user = await User.findOne({ username: p.username }).select('coins');
      p.coins = user ? user.coins : 50;
    }
    
    rooms[roomId] = {
      roomId: savedGameState.roomId,
      players: savedGameState.players.map(p => {
        const sessionPlayer = session.players.find(sp => sp.username === p.username);
        return {
          ...p,
          id: sessionPlayer ? sessionPlayer.id : p.id,
          color: sessionPlayer ? sessionPlayer.color : p.color
        };
      }),
      difficulty: savedGameState.difficulty,
      mode: savedGameState.mode,
      isDarkTheme: savedGameState.isDarkTheme,
      gameStarted: true,
      grid: savedGameState.grid,
      nextNumber: savedGameState.nextNumber,
      message: 'Tiếp tục trò chơi đã lưu!',
      turn: savedGameState.turn,
      foundNumbers: savedGameState.foundNumbers
    };
    
    if (session.timeout) clearTimeout(session.timeout);
    io.to(roomId).emit('game_state', rooms[roomId]);
    delete resumeSessions[roomId];
  });
  
  socket.on('start_game', (data) => {
    let roomId = null;
    for (const id in rooms) {
      if (rooms[id].players.some(p => p.id === socket.id)) {
        roomId = id;
        break;
      }
    }
    
    if (!roomId) return;
    const room = rooms[roomId];
    const playerCreator = room.players.find(p => p.isCreator);
    
    if (playerCreator && playerCreator.id !== socket.id) {
      socket.emit('error', 'Chỉ chủ phòng mới có thể bắt đầu trò chơi!');
      return;
    }
    
    room.grid = generateGridByDifficulty(room.difficulty);
    room.gameStarted = true;
    room.message = 'Trò chơi đã bắt đầu!';
    io.to(roomId).emit('game_state', room);
  });
  
  socket.on('number_click', async (data) => {
    const { number } = data;
    let roomId = null;
    
    for (const id in rooms) {
      if (rooms[id].players.some(p => p.id === socket.id)) {
        roomId = id;
        break;
      }
    }
    
    if (!roomId) return;
    const room = rooms[roomId];
    const currentPlayer = room.players.find(p => p.id === socket.id);
    
    if (number === room.nextNumber) {
      room.foundNumbers[number] = currentPlayer.id;
      room.nextNumber++;
      currentPlayer.score++;
      
      if (room.nextNumber > room.grid.length) {
        // GAME OVER - Xử lý coins
        const [player1, player2] = room.players;
        let winner, loser, isDraw = false;
        
        if (player1.score > player2.score) {
          winner = player1;
          loser = player2;
        } else if (player2.score > player1.score) {
          winner = player2;
          loser = player1;
        } else {
          isDraw = true;
        }
        
        const coinResults = {};
        let gameMessage = '';
        
        if (isDraw) {
          // Hòa: cả 2 +5 xu
          const result1 = await updateUserCoins(player1.username, 5);
          const result2 = await updateUserCoins(player2.username, 5);
          coinResults[player1.username] = result1;
          coinResults[player2.username] = result2;
          gameMessage = `Hòa ${player1.score}-${player2.score}!`;
          
          // Cập nhật coins trong room
          player1.coins = result1.newTotal;
          player2.coins = result2.newTotal;
          
          await saveMatchResult(room, 'draw');
        } else {
          // Thắng/Thua
          const winResult = await updateUserCoins(winner.username, 10);
          const loseResult = await updateUserCoins(loser.username, -10);
          coinResults[winner.username] = winResult;
          coinResults[loser.username] = loseResult;
          gameMessage = `${winner.username} đã chiến thắng ${winner.score}-${loser.score}!`;
          
          winner.coins = winResult.newTotal;
          loser.coins = loseResult.newTotal;
          
          await saveMatchResult(room, winner.username);
        }
        
        io.to(roomId).emit('game_over', {
          message: gameMessage,
          coinResults,
          finalScores: {
            [player1.username]: player1.score,
            [player2.username]: player2.score
          }
        });
        
        return;
      }
      
      io.to(roomId).emit('number_found', room);
    }
  });
  
  socket.on('toggle_theme', () => {
    let roomId = null;
    for (const id in rooms) {
      if (rooms[id].players.some(p => p.id === socket.id)) {
        roomId = id;
        break;
      }
    }
    if (!roomId) return;
    
    const room = rooms[roomId];
    room.isDarkTheme = !room.isDarkTheme;
    io.to(roomId).emit('room_state', room);
    if (room.gameStarted) {
      io.to(roomId).emit('game_state', room);
    }
  });
  
  socket.on('change_color', (data) => {
    const { color } = data;
    let roomId = null;
    
    for (const id in rooms) {
      if (rooms[id].players.some(p => p.id === socket.id)) {
        roomId = id;
        break;
      }
    }
    
    if (!roomId) return;
    const room = rooms[roomId];
    const currentPlayer = room.players.find(p => p.id === socket.id);
    
    if (currentPlayer) {
      currentPlayer.color = color;
      io.to(roomId).emit('room_state', room);
      if (room.gameStarted) {
        io.to(roomId).emit('game_state', room);
      }
    }
  });
  
  socket.on('leave_room', (data) => {
    const { roomId, username } = data;
    console.log(`${username} leaving room ${roomId}`);
    
    const room = rooms[roomId];
    if (room) {
      const playerIndex = room.players.findIndex(p => p.username === username);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 1) {
          room.message = 'Một người chơi đã thoát. Đang chờ người chơi mới...';
          room.gameStarted = false;
          io.to(roomId).emit('room_state', room);
        } else if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
        }
      }
    }
    
    socket.leave(roomId);
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Check resume sessions
    for (const roomId in resumeSessions) {
      const session = resumeSessions[roomId];
      const playerIndex = session.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const disconnectedPlayer = session.players[playerIndex];
        session.readyPlayers = session.readyPlayers.filter(u => u !== disconnectedPlayer.username);
        session.players.splice(playerIndex, 1);
        
        io.to(roomId).emit('resume_player_left', {
          message: `${disconnectedPlayer.username} đã thoát khỏi phòng chờ.`,
          readyPlayers: session.readyPlayers
        });
        
        if (session.players.length === 0) {
          if (session.timeout) clearTimeout(session.timeout);
          delete resumeSessions[roomId];
        }
      }
    }
    
    // Check active rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 1) {
          room.message = 'Một người chơi đã thoát. Đang chờ người chơi mới...';
          room.turn = room.players[0].id;
          io.to(roomId).emit('room_state', room);
        } else if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
        }
        break;
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("Server is running successfully! 😺");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
