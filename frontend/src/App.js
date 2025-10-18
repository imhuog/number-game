import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import './custom.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import AuthPage from './pages/AuthPage';
import GameRoomPage from './pages/GameRoomPage';
import ProfilePage from './pages/ProfilePage';
import SoloGamePage from './pages/SoloGamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ChooseModePage from './pages/ChooseModePage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div>
          <Routes>
            {/* Trang đăng nhập/đăng ký - PUBLIC */}
            <Route path="/" element={<AuthPage />} />

            {/* ⭐ Các trang cần đăng nhập - PROTECTED */}
            <Route 
              path="/choose-mode" 
              element={
                <ProtectedRoute>
                  <ChooseModePage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/game" 
              element={
                <ProtectedRoute>
                  <GameRoomPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/solo" 
              element={
                <ProtectedRoute>
                  <SoloGamePage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/leaderboard" 
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
          </Routes>

          {/* 🎨 Toast notifications - CUSTOM */}
          <ToastContainer 
            position="top-right"
            autoClose={500}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            style={{
              top: '20px',
              right: '20px',
              zIndex: 9999
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
