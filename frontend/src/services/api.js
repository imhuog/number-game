import axios from "axios";

// 🌈 Tự động chọn baseURL theo môi trường
const API_URL =
  process.env.NODE_ENV === "production"
    ? "https://number-game-l446.onrender.com/api"
    : "http://localhost:5000/api";

const API = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Interceptor để tự động thêm token vào header
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ⭐ Interceptor xử lý lỗi 401 (token hết hạn)
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token hết hạn hoặc không hợp lệ
            localStorage.removeItem('token');
            localStorage.removeItem('redirectAfterLogin');
            
            // Redirect về trang login nếu không phải đang ở trang login
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const register = (userData) => API.post('/auth/register', userData);
export const login = (userData) => API.post('/auth/login', userData);
export const getUserProfile = () => API.get('/auth/profile');

// ⭐ THÊM MỚI: Verify token
export const verifyToken = () => API.get('/auth/verify');

// ⭐ Lấy coins hiện tại từ server
export const getUserCoins = () => API.get('/auth/coins');

// Solo Game APIs
export const finishSoloGame = (data) => API.post('/solo/finish', data);
export const getSoloLeaderboard = () => API.get('/solo/leaderboard');

// Saved Game APIs - SOLO
export const saveSoloGame = (gameData) => API.post('/saved-game/save-solo', gameData);
export const getSavedSoloGame = () => API.get('/saved-game/saved-solo');
export const deleteSavedSoloGame = () => API.delete('/saved-game/saved-solo');

// Saved Game APIs - MULTIPLAYER
export const saveMultiplayerGame = (gameData) => API.post('/saved-game/save-multiplayer', gameData);
export const getSavedMultiplayerGame = () => API.get('/saved-game/saved-multiplayer');
export const resumeMultiplayerGame = (roomId) => API.post('/saved-game/resume-multiplayer', { roomId });
export const deleteSavedMultiplayerGame = (roomId) => API.delete(`/saved-game/saved-multiplayer/${roomId}`);

// Mark game as completed
export const markGameCompleted = (gameType, roomId = null) => 
    API.post('/saved-game/complete', { gameType, roomId });
