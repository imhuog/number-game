// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserIcon, 
  CurrencyDollarIcon, 
  ArrowLeftOnRectangleIcon,
  ChartBarIcon 
} from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState({ username: '', coins: 50 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/');
          return;
        }

        const response = await axios.get(`${API_URL}/api/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setUserInfo(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Không thể tải thông tin profile');
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleBackToGame = () => {
    navigate('/game');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Đã đăng xuất thành công!');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Profile</h1>
          <div className="w-16 h-1 bg-pink-400 rounded-full mx-auto"></div>
        </div>

        {/* Profile Card */}
        <div className="bg-white bg-opacity-10 rounded-3xl p-8 shadow-2xl backdrop-filter backdrop-blur-lg border border-opacity-20 border-white space-y-6">
          
          {/* User Avatar & Name */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserIcon className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold">{userInfo.username}</h2>
          </div>

          {/* Coins Display */}
          <div className="bg-yellow-500 bg-opacity-20 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center space-x-3 mb-2">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-400" />
              <span className="text-3xl font-bold text-yellow-300">{userInfo.coins}</span>
              <span className="text-xl text-yellow-200">xu</span>
            </div>
            <p className="text-yellow-200 text-sm">Số dư hiện tại</p>
          </div>

          {/* Game Rules */}
          <div className="bg-white bg-opacity-5 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <ChartBarIcon className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-blue-300">Quy tắc tính điểm</h3>
            </div>
            
            <div className="space-y-2 text-sm text-gray-200">
              <div className="flex justify-between items-center">
                <span>🏆 Thắng:</span>
                <span className="text-green-400 font-semibold">+10 xu</span>
              </div>
              <div className="flex justify-between items-center">
                <span>❌ Thua:</span>
                <span className="text-red-400 font-semibold">-10 xu</span>
              </div>
              <div className="flex justify-between items-center">
                <span>🤝 Hòa:</span>
                <span className="text-yellow-400 font-semibold">+5 xu</span>
              </div>
              <div className="text-xs text-gray-400 mt-3 p-2 bg-blue-500 bg-opacity-10 rounded-lg">
                <span className="font-semibold text-blue-300">Lưu ý:</span> Nếu số xu của bạn về 0, hệ thống sẽ tự động cấp lại 50 xu.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button 
              onClick={handleBackToGame}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-800 hover:shadow-xl transition duration-300"
            >
              <ChartBarIcon className="h-5 w-5 mr-2 inline-block" />
              Quay lại Game
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl transition duration-300"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 inline-block" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 text-center text-gray-300 text-sm space-y-1">
          <p>Số xu bắt đầu: 50 xu</p>
          <p>Chơi game để kiếm thêm xu!</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;