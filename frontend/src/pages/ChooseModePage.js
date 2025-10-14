import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChooseModePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-8">Chọn chế độ chơi</h1>
      <div className="space-y-4">
        <button onClick={() => navigate('/solo')} className="btn-start w-64">🎮 Chơi 1 mình</button>
        <button onClick={() => navigate('/game')} className="btn-create w-64">🤝 Chơi với bạn</button>
        <button onClick={() => navigate('/leaderboard')} className="btn-join w-64">🏆 Bảng xếp hạng</button>
      </div>
    </div>
  );
};

export default ChooseModePage;
