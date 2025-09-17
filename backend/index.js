const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');

dotenv.config(); // Load biến môi trường từ file .env

const app = express();

// Kết nối đến cơ sở dữ liệu
connectDB();

// Middleware để phân tích JSON body từ request
app.use(express.json());

// Sử dụng các route auth
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
