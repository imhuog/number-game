import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import './custom.css';

// Các trang
import AuthPage from './pages/AuthPage';
import GameRoomPage from './pages/GameRoomPage';
import ProfilePage from './pages/ProfilePage';

// Trang mới
import SoloGamePage from './pages/SoloGamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ChooseModePage from './pages/ChooseModePage';

function App() {
  return (
    <Router>
      <div>
        <Routes>
          {/* Trang đăng nhập/đăng ký */}
          <Route path="/" element={<AuthPage />} />

          {/* Chọn chế độ */}
          <Route path="/choose-mode" element={<ChooseModePage />} />

          {/* Chế độ chơi */}
          <Route path="/game" element={<GameRoomPage />} />       {/* Multiplayer */}
          <Route path="/solo" element={<SoloGamePage />} />       {/* Solo */}

          {/* Leaderboard */}
          <Route path="/leaderboard" element={<LeaderboardPage />} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>

        {/* Toast notifications */}
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
