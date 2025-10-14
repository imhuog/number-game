const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
app.use(express.json());
app.use(cors());
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully!');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    }
};
connectDB();
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
let rooms = {};
// Helper function to generate grid based on difficulty
const generateGridByDifficulty = (difficulty) => {
    let maxNumber;
    switch (difficulty) {
        case 'easy':
            maxNumber = 100;
            break;
        case 'medium':
            maxNumber = 150;
            break;
        case 'hard':
            maxNumber = 200;
            break;
        default:
            maxNumber = 100;
    }
    
    return Array.from({ length: maxNumber }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
};
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    // Sự kiện tạo phòng mới
    socket.on('create_room', (data) => {
        const { username, difficulty, mode, color } = data;
        const roomId = uuidv4().substring(0, 6);
        const newPlayer = { id: socket.id, username, score: 0, color, isCreator: true };
        
        // Generate grid based on selected difficulty
        const grid = generateGridByDifficulty(difficulty);
        
        rooms[roomId] = {
            roomId: roomId,
            players: [newPlayer],
            difficulty: difficulty,
            mode: mode,
            isDarkTheme: false,
            gameStarted: false,
            grid: grid, // Use the generated grid based on difficulty
            nextNumber: 1,
            message: 'Phòng của bạn đã sẵn sàng. Đang chờ người chơi khác...',
            turn: socket.id,
            foundNumbers: {}
        };
        socket.join(roomId);
        io.to(roomId).emit('room_state', rooms[roomId]);
    });
    // Sự kiện tham gia phòng
    socket.on('join_room', (data) => {
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
        
        const newPlayer = { id: socket.id, username, score: 0, color, isCreator: false };
        room.players.push(newPlayer);
        socket.join(roomId);
        room.message = `Người chơi ${username} đã tham gia.`;
        io.to(roomId).emit('room_state', room);
    });
    
    // Sự kiện bắt đầu game
    socket.on('start_game', () => {
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
        
        // Regenerate grid when game starts to ensure fresh randomization
        room.grid = generateGridByDifficulty(room.difficulty);
        room.gameStarted = true;
        room.message = 'Trò chơi đã bắt đầu!';
        io.to(roomId).emit('game_state', room);
    });
    // Sự kiện click vào số
    socket.on('number_click', (data) => {
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
        // if (room.turn !== socket.id) {
        //     socket.emit('error', 'Không phải lượt của bạn!');
        //     return;
        // }
        if (number === room.nextNumber) {
            room.foundNumbers[number] = currentPlayer.id; // Lưu ID người chơi
            room.nextNumber++;
            currentPlayer.score++;
            // room.turn = room.players.find(p => p.id !== socket.id).id;
            if (room.nextNumber > room.grid.length) {
                let winner = room.players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
                io.to(roomId).emit('game_over', { message: `${winner.username} đã chiến thắng!` });
                return;
            }
            io.to(roomId).emit('number_found', room);
        } else {
            // Xử lý click sai số
        }
    });
    // Sự kiện toggle theme
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
    
    // Sự kiện thay đổi màu
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
    
    // Xử lý khi người chơi thoát
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});