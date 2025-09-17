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
});

const User = mongoose.model('User', userSchema);
module.exports = User;
