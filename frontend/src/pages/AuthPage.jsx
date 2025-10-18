import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { isAuthenticated, login: authLogin, loading } = useAuth();

    // ⭐ Auto redirect nếu đã đăng nhập
    useEffect(() => {
        if (!loading && isAuthenticated) {
            const redirectPath = localStorage.getItem('redirectAfterLogin');
            if (redirectPath) {
                navigate(redirectPath);
                localStorage.removeItem('redirectAfterLogin');
            } else {
                navigate('/choose-mode');
            }
        }
    }, [isAuthenticated, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            if (isLogin) {
                const res = await login({ username, password });
                
                // ⭐ Sử dụng authLogin từ context
                authLogin(res.data.token, res.data.user);
                
                setMessage('Đăng nhập thành công! Đang chuyển hướng...');

                const redirectPath = localStorage.getItem('redirectAfterLogin');
                setTimeout(() => {
                    if (redirectPath) {
                        navigate(redirectPath);
                        localStorage.removeItem('redirectAfterLogin');
                    } else {
                        navigate('/choose-mode');
                    }
                }, 1000);
            } else {
                const res = await register({ username, password });
                setMessage(res.data.msg);
                if (res.status === 201) {
                    setIsLogin(true);
                }
            }
        } catch (err) {
            setMessage(err.response?.data?.msg || 'Đã có lỗi xảy ra.');
        }
    };

    // ⭐ Hiển thị loading khi đang kiểm tra auth
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-400"></div>
                    <p className="mt-4 text-white text-xl">Đang kiểm tra đăng nhập...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 overflow-hidden flex flex-col justify-between p-4">
            {/* Background shape */}
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-bl-full transform -translate-y-1/2 -translate-x-1/4 opacity-75 md:w-1/2 md:h-2/5"></div>
            <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-l from-indigo-500 to-blue-600 rounded-tr-full transform translate-y-1/2 translate-x-1/4 opacity-75 md:w-1/2 md:h-2/5"></div>

            {/* Title */}
            <div className="relative z-10 flex flex-col items-center justify-center pt-20 pb-10">
                <h1 className="text-6xl font-bold text-white mb-2 tracking-wide">
                    {isLogin ? 'Login' : 'Register'}
                </h1>
                <div className="w-24 h-2 bg-pink-400 rounded-full mt-2"></div>
            </div>

            {/* Form */}
            <div className="relative z-10 flex-grow flex items-center justify-center px-4">
                <div className="bg-white bg-opacity-10 p-8 rounded-3xl shadow-2xl w-full max-w-sm backdrop-filter backdrop-blur-lg border border-opacity-20 border-white space-y-6">
                    {/* Username */}
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white opacity-80 h-6 w-6" />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full pl-14 pr-4 py-3 bg-white bg-opacity-20 rounded-full text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white opacity-80 h-6 w-6" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-14 pr-12 py-3 bg-white bg-opacity-20 rounded-full text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white transition"
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="h-6 w-6" />
                            ) : (
                                <EyeIcon className="h-6 w-6" />
                            )}
                        </button>
                    </div>

                    {/* Switch form */}
                    <p className="text-center text-gray-200">
                        {isLogin ? "Haven't Account?" : "Already have an account?"}{' '}
                        <span
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-pink-300 hover:text-pink-100 cursor-pointer font-semibold transition duration-300"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </span>
                    </p>

                    {/* Submit */}
                    <div className="flex justify-center mt-6">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-xl hover:scale-105 transition duration-300 transform glowing-shadow-pink"
                        >
                            <ArrowRightIcon className="h-10 w-10 text-white" />
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <p className="text-center text-pink-200 mt-4">{message}</p>
                    )}
                </div>
            </div>

            {/* Footer shapes */}
            <div className="relative z-0 flex justify-center pb-10 space-x-12 opacity-50">
                <div className="w-24 h-24 bg-gray-700 rounded-full transform rotate-12 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
                </div>
                <div className="w-24 h-24 bg-gray-700 rounded-full transform -rotate-12 flex items-center justify-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
