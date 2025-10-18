import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Đang kiểm tra token
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-400"></div>
                    <p className="mt-4 text-white text-xl">Đang tải...</p>
                </div>
            </div>
        );
    }

    // Chưa đăng nhập → redirect về trang login
    if (!isAuthenticated) {
        // Lưu đường dẫn hiện tại để redirect lại sau khi đăng nhập
        localStorage.setItem('redirectAfterLogin', location.pathname);
        return <Navigate to="/" replace />;
    }

    // Đã đăng nhập → cho vào trang
    return children;
};

export default ProtectedRoute;
