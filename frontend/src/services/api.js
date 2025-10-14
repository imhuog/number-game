import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api',
});

// Hàm để đăng ký tài khoản
export const register = (userData) => API.post('/auth/register', userData);

// Hàm để đăng nhập
export const login = (userData) => API.post('/auth/login', userData);