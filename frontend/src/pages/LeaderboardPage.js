// src/pages/LeaderboardPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const LeaderboardPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/solo/leaderboard');
        setRows(res.data.leaderboard || []);
      } catch (err) {
        console.error(err);
        toast.error('Không thể tải leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const formatMs = (ms) => {
    if (ms == null) return '--:--:--';
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${mm}:${ss}.${cs}`;
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-800 to-indigo-900 text-white">
      <div className="max-w-3xl mx-auto bg-white bg-opacity-6 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Leaderboard - Solo</h1>
          <div>
            <button
              onClick={() => navigate('/choose-mode')}
              className="btn-leave px-3 py-1 rounded"
            >
              ⬅️ Quay lại
            </button>
          </div>
        </div>

        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left border-b border-white/20">
                <th className="py-2 w-12">#</th>
                <th>Username</th>
                <th className="text-right">Best Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center">Chưa có kết quả nào</td>
                </tr>
              )}
              {rows.map((r, idx) => (
                <tr key={r.username} className="border-b border-white/10">
                  <td className="py-2">{idx + 1}</td>
                  <td>{r.username}</td>
                  <td className="font-mono text-right">{formatMs(r.bestSoloTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
