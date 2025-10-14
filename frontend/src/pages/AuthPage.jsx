import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '../services/api';
import { UserIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            if (isLogin) {
                const res = await login({ username, password });
                localStorage.setItem('token', res.data.token);
                setMessage('Đăng nhập thành công! Đang chuyển hướng...');

                const redirectPath = localStorage.getItem('redirectAfterLogin');
                
                setTimeout(() => {
  if (redirectPath) {
    navigate(redirectPath);
    localStorage.removeItem('redirectAfterLogin');
  } else {
    navigate('/choose-mode'); // về trang chọn chế độ
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

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 overflow-hidden flex flex-col justify-between p-4">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-bl-full transform -translate-y-1/2 -translate-x-1/4 opacity-75 md:w-1/2 md:h-2/5"></div>
            <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-l from-indigo-500 to-blue-600 rounded-tr-full transform translate-y-1/2 translate-x-1/4 opacity-75 md:w-1/2 md:h-2/5"></div>

            <div className="relative z-10 flex flex-col items-center justify-center pt-20 pb-10">
                <h1 className="text-6xl font-bold text-white mb-2 tracking-wide">
                    {isLogin ? 'Login' : 'Register'}
                </h1>
                <div className="w-24 h-2 bg-pink-400 rounded-full mt-2"></div>
            </div>

            <div className="relative z-10 flex-grow flex items-center justify-center px-4">
                <div className="bg-white bg-opacity-10 p-8 rounded-3xl shadow-2xl w-full max-w-sm backdrop-filter backdrop-blur-lg border border-opacity-20 border-white space-y-6">
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

                    <div className="relative">
                        <LockClosedIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white opacity-80 h-6 w-6" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full pl-14 pr-4 py-3 bg-white bg-opacity-20 rounded-full text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
                        />
                    </div>

                    <p className="text-center text-gray-200">
                        {isLogin ? "Haven't Account?" : "Already have an account?"}{' '}
                        <span 
                            onClick={() => setIsLogin(!isLogin)} 
                            className="text-pink-300 hover:text-pink-100 cursor-pointer font-semibold transition duration-300"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </span>
                    </p>

                    <div className="flex justify-center mt-6">
                        <button 
                            type="submit" 
                            onClick={handleSubmit}
                            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-xl hover:scale-105 transition duration-300 transform glowing-shadow-pink"
                        >
                            <ArrowRightIcon className="h-10 w-10 text-white" />
                        </button>
                    </div>

                    {message && (
                        <p className="text-center text-pink-200 mt-4">{message}</p>
                    )}
                </div>
            </div>

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