// src/pages/LeaderboardPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// ⚠️ NOTE: Đây là file code để copy vào project của bạn
// Không phải React artifact vì cần axios, react-router-dom, react-toastify

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LeaderboardPage = () => {
  const [soloLeaderboards, setSoloLeaderboards] = useState({ easy: [], medium: [], hard: [] });
  const [multiplayerLeaderboard, setMultiplayerLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('solo');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      
      // Fetch solo leaderboards
      const soloRes = await axios.get(`${API_URL}/api/solo/leaderboard`);
      setSoloLeaderboards(soloRes.data.leaderboards || { easy: [], medium: [], hard: [] });
      
      // Fetch multiplayer leaderboard
      const multiRes = await axios.get(`${API_URL}/api/multiplayer/leaderboard`);
      setMultiplayerLeaderboard(multiRes.data.leaderboard || []);
      
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatMs = (ms) => {
    if (ms == null) return '--:--:--';
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${mm}:${ss}.${cs}`;
  };

  const getDifficultyLabel = (diff) => {
    const labels = { easy: 'Dễ (1-50)', medium: 'Trung bình (1-100)', hard: 'Khó (1-150)' };
    return labels[diff] || diff;
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-800 to-indigo-900 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">🏆 Bảng Xếp Hạng</h1>
          <button
            onClick={() => navigate('/choose-mode')}
            className="btn-leave px-4 py-2 rounded-lg"
          >
            ⬅️ Quay lại
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('solo')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'solo'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            🎮 Solo
          </button>
          <button
            onClick={() => setActiveTab('multiplayer')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'multiplayer'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
          >
            🤝 Multiplayer
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-pink-500 mx-auto"></div>
            <p className="mt-4">Đang tải...</p>
          </div>
        ) : (
          <>
            {/* SOLO TAB */}
            {activeTab === 'solo' && (
              <div className="grid md:grid-cols-3 gap-6">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <div key={diff} className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-lg">
                    <h2 className="text-xl font-bold mb-4 text-center text-pink-300">
                      {getDifficultyLabel(diff)}
                    </h2>
                    
                    {soloLeaderboards[diff].length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Chưa có kết quả</p>
                    ) : (
                      <div className="space-y-2">
                        {soloLeaderboards[diff].map((user, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              idx < 3 ? 'bg-yellow-500 bg-opacity-20' : 'bg-white bg-opacity-5'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getMedalEmoji(idx + 1)}</span>
                              <span className="font-semibold">{user.username}</span>
                            </div>
                            <span className="font-mono text-sm text-pink-300">
                              {formatMs(user.bestTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* MULTIPLAYER TAB */}
            {activeTab === 'multiplayer' && (
              <div className="bg-white bg-opacity-10 rounded-xl p-6 backdrop-blur-lg">
                <h2 className="text-2xl font-bold mb-6 text-center">Ai là người thắng cuộc</h2>
                
                {multiplayerLeaderboard.length === 0 ? (
                  <p className="text-center text-gray-400 py-12">Chưa có trận đấu nào</p>
                ) : (
                  <div className="space-y-4">
                    {multiplayerLeaderboard.map((pair, idx) => {
                      const player1Lead = pair.player1Wins > pair.player2Wins;
                      const player2Lead = pair.player2Wins > pair.player1Wins;
                      const isTie = pair.player1Wins === pair.player2Wins;
                      
                      return (
                        <div
                          key={idx}
                          className="bg-white bg-opacity-5 rounded-lg p-5 hover:bg-opacity-10 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            {/* Player 1 */}
                            <div className="flex items-center space-x-3 flex-1">
                              <span className={`text-base font-bold ${
                                player1Lead ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {pair.player1}
                              </span>
                              {pair.player1Wins > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-yellow-400">🏅</span>
                                  <span className="text-base font-bold text-yellow-300">
                                    {pair.player1Wins}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* VS */}
                            <div className="px-4 text-gray-400 font-bold">VS</div>

                            {/* Player 2 */}
                            <div className="flex items-center space-x-3 flex-1 justify-end">
                              {pair.player2Wins > 0 && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-base font-bold text-yellow-300">
                                    {pair.player2Wins}
                                  </span>
                                  <span className="text-yellow-400">🏅</span>
                                </div>
                              )}
                              <span className={`text-base font-bold ${
                                player2Lead ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {pair.player2}
                              </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="mt-3 flex justify-center space-x-6 text-sm text-gray-300">
                            <span>Tổng: {pair.totalMatches} trận</span>
                            {pair.draws > 0 && <span>Hòa: {pair.draws}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
