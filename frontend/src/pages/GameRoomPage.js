// src/pages/GameRoomPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import {
  UserIcon, ClipboardIcon, ArrowLeftOnRectangleIcon,
  PlayIcon, CheckCircleIcon, SunIcon, MoonIcon, CurrencyDollarIcon
} from '@heroicons/react/24/solid';
import { toast } from 'react-toastify';

const socket = io('http://localhost:5000');

// Detect mobile
const isMobileDevice = () => window.innerWidth <= 768;

const GameRoomPage = () => {
  const [players, setPlayers] = useState([]);
  const [grid, setGrid] = useState([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [message, setMessage] = useState('Đang chờ người chơi...');
  const [hasJoined, setHasJoined] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState('shuffle');
  const [myColor, setMyColor] = useState('#FF5733');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [foundNumbers, setFoundNumbers] = useState({});
  const [positions, setPositions] = useState([]);
  const [userCoins, setUserCoins] = useState(50);

  const gameContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // --- Helpers ---
  const normalizeFoundNumbers = (raw) => {
    if (!raw) return {};
    const out = {};
    Object.entries(raw).forEach(([k, v]) => {
      const n = Number(k);
      out[n] = v;
    });
    return out;
  };

  const getPlayerColorById = (id) => players.find(p => p.id === id)?.color || null;

  // Lấy config theo số lượng và device (giống SoloGamePage)
  const getGameConfig = (totalNumbers, isMobile) => {
    if (!isMobile) {
      // Desktop - giữ nguyên
      return { itemSize: 56, fontSize: 20, minDistanceMultiplier: 0.6 };
    }

    // Mobile - tối ưu theo số lượng
    if (totalNumbers <= 100) {
      return { itemSize: 36, fontSize: 25, minDistanceMultiplier: 0.75 };
    } else if (totalNumbers <= 150) {
      return { itemSize: 34, fontSize: 16, minDistanceMultiplier: 0.7 };
    } else {
      return { itemSize: 30, fontSize: 13, minDistanceMultiplier: 0.65 };
    }
  };

  const generateRandomPositions = useCallback((shouldShuffle = false) => {
    if (!gameStarted || !grid || grid.length === 0 || !gameContainerRef.current) return;
    
    const totalNumbers = grid.length;
    const isMobile = isMobileDevice();
    const config = getGameConfig(totalNumbers, isMobile);
    
    let containerWidth, containerHeight;
    
    if (isMobile) {
      // MOBILE: Full màn hình
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      containerWidth = screenWidth;
      containerHeight = screenHeight - 120; // Trừ space cho timer và next number
    } else {
      // DESKTOP: Giữ nguyên logic cũ
      if (totalNumbers <= 100) {
        containerWidth = Math.min(600, gameContainerRef.current.offsetWidth);
        containerHeight = Math.min(500, gameContainerRef.current.offsetHeight);
      } else if (totalNumbers <= 150) {
        containerWidth = Math.min(750, gameContainerRef.current.offsetWidth);
        containerHeight = Math.min(600, gameContainerRef.current.offsetHeight);
      } else {
        containerWidth = Math.min(900, gameContainerRef.current.offsetWidth);
        containerHeight = Math.min(700, gameContainerRef.current.offsetHeight);
      }
    }
    
    const margin = isMobile ? 4 : 20;
    const availableWidth = Math.max(100, containerWidth - 2 * margin);
    const availableHeight = Math.max(100, containerHeight - 2 * margin);
    
    // Tính minDistance động
    const approxCellArea = (availableWidth * availableHeight) / Math.max(1, grid.length);
    const approxCellSize = Math.sqrt(approxCellArea);
    
    const minDistance = Math.max(
      config.itemSize * config.minDistanceMultiplier, 
      Math.min(isMobile ? 70 : 100, approxCellSize * 0.6)
    );

    let numbersToPosition = [...grid];
    if (shouldShuffle) {
      for (let i = numbersToPosition.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbersToPosition[i], numbersToPosition[j]] = [numbersToPosition[j], numbersToPosition[i]];
      }
    }

    const newPositions = [];
    const maxAttempts = isMobile ? 3000 : 600;
    
    numbersToPosition.forEach((num) => {
      let pos = null;
      let attempts = 0;
      
      while (!pos && attempts < maxAttempts) {
        const maxX = availableWidth - config.itemSize;
        const maxY = availableHeight - config.itemSize;
        
        const randX = margin + Math.random() * Math.max(0, maxX);
        const randY = margin + Math.random() * Math.max(0, maxY);
        
        const tooClose = newPositions.some(p => {
          const dx = p.x - randX;
          const dy = p.y - randY;
          return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
        
        if (!tooClose) {
          pos = { number: num, x: randX, y: randY };
        }
        attempts++;
      }
      
      // Fallback với grid layout nếu không tìm được vị trí
      if (!pos) {
        const cols = Math.ceil(Math.sqrt(totalNumbers));
        const index = newPositions.length;
        const row = Math.floor(index / cols);
        const col = index % cols;
        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / Math.ceil(totalNumbers / cols);
        
        pos = {
          number: num,
          x: margin + col * cellWidth + Math.random() * (cellWidth - config.itemSize),
          y: margin + row * cellHeight + Math.random() * (cellHeight - config.itemSize)
        };
      }
      newPositions.push(pos);
    });

    newPositions.sort((a, b) => {
      const na = typeof a.number === 'number' ? a.number : Number(a.number);
      const nb = typeof b.number === 'number' ? b.number : Number(b.number);
      return na - nb;
    });

    setPositions(newPositions);
  }, [gameStarted, grid]);

  // --- Socket & lifecycle ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
      navigate('/');
      return;
    }

    let userUsername = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userUsername = payload.user.username;
      setUsername(userUsername);
    } catch (err) {
      console.error('Invalid token', err);
      navigate('/');
      return;
    }

    const qp = new URLSearchParams(location.search);
    const r = qp.get('room');
    if (r) setJoinRoomId(r);

    socket.on('room_state', (data) => {
      setPlayers(data.players || []);
      setMessage(data.message || '');
      setRoomId(data.roomId || '');
      setHasJoined(true);
      setGameStarted(!!data.gameStarted);
      setIsDarkTheme(!!data.isDarkTheme);

      if (data.difficulty) setDifficulty(data.difficulty);
      if (data.mode) setMode(data.mode);

      const me = (data.players || []).find(p => p.username === userUsername);
      if (me) {
        setMyColor(me.color);
        setUserCoins(me.coins || 50);
      }
    });

    socket.on('game_state', (data) => {
      setPlayers(data.players || []);
      setMessage(data.message || '');
      setGrid(data.grid || []);
      setNextNumber(data.nextNumber || 1);
      setGameStarted(!!data.gameStarted);
      setFoundNumbers(normalizeFoundNumbers(data.foundNumbers || {}));
    });

    socket.on('number_found', (data) => {
      setGrid(data.grid || []);
      setNextNumber(data.nextNumber || 1);
      setPlayers(data.players || []);
      setFoundNumbers(normalizeFoundNumbers(data.foundNumbers || {}));

      if (mode === 'shuffle') {
        setTimeout(() => generateRandomPositions(true), 100);
      }
    });

    socket.on('game_over', (data) => {
      const { message: gameMessage, coinResults, finalScores } = data;
      
      setPlayers(prevPlayers => 
        prevPlayers.map(player => ({
          ...player,
          coins: coinResults[player.username]?.newTotal || player.coins
        }))
      );

      if (coinResults[userUsername]) {
        setUserCoins(coinResults[userUsername].newTotal);
        
        const coinChange = coinResults[userUsername].change;
        if (coinChange > 0) {
          toast.success(`🎉 ${gameMessage} Bạn được +${coinChange} xu! Tổng: ${coinResults[userUsername].newTotal} xu`);
        } else if (coinChange < 0) {
          if (coinResults[userUsername].newTotal === 50) {
            toast.info(`${gameMessage} Bạn bị -10 xu nhưng đã được reset về 50 xu!`);
          } else {
            toast.error(`${gameMessage} Bạn bị ${coinChange} xu! Tổng: ${coinResults[userUsername].newTotal} xu`);
          }
        } else {
          toast.success(`🤝 ${gameMessage} Bạn được +5 xu! Tổng: ${coinResults[userUsername].newTotal} xu`);
        }
      } else {
        toast.info(gameMessage);
      }

      setMessage(gameMessage);
      setGameStarted(false);
      setFoundNumbers({});
    });

    socket.on('error', (errMsg) => {
      toast.error(errMsg || 'Error');
      setMessage(errMsg || 'Error');
      setHasJoined(false);
    });

    return () => {
      socket.off('room_state');
      socket.off('game_state');
      socket.off('number_found');
      socket.off('game_over');
      socket.off('error');
    };
  }, [navigate, location.pathname, location.search, mode, generateRandomPositions, username]);

  useEffect(() => {
    if (gameStarted && grid.length > 0 && gameContainerRef.current) {
      if (positions.length === 0) {
        const timer = setTimeout(() => generateRandomPositions(false), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [gameStarted, grid, positions.length, generateRandomPositions]);

  useEffect(() => {
    const onResize = () => {
      if (gameStarted && grid.length > 0) {
        setTimeout(() => generateRandomPositions(false), 150);
      }
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [gameStarted, grid, generateRandomPositions]);

  // --- handlers ---
  const handleCreateRoom = () => {
    socket.emit('create_room', { username, difficulty, mode, color: myColor });
  };

  const handleJoinRoom = () => {
    if (joinRoomId && joinRoomId.length > 0) {
      socket.emit('join_room', { roomId: joinRoomId, username, color: myColor });
    } else {
      toast.warn('Vui lòng nhập ID phòng!');
    }
  };

  const handleStartGame = () => {
    socket.emit('start_game');
    setPositions([]); // Reset positions khi start game
  };

  const handleLeaveRoom = () => {
    console.log('Leave room clicked');
    try {
      socket.emit('leave_room', { roomId, username });
      setHasJoined(false);
      setRoomId('');
      setJoinRoomId('');
      navigate('/game');
    } catch (error) {
      console.error('Error leaving room:', error);
      navigate('/game');
    }
  };

  const handleNumberClick = (number) => {
    if (gameStarted) {
      socket.emit('number_click', { number });
    } else {
      toast.warn('Trò chơi chưa bắt đầu!');
    }
  };

  const handleThemeToggle = () => socket.emit('toggle_theme');

  const handleColorChange = (newColor) => {
    setMyColor(newColor);
    socket.emit('change_color', { color: newColor });
  };

  const isMySelf = (player) => player.username === username;
  const isPlayerCreator = players.find(p => isMySelf(p))?.isCreator;
  const secondPlayerJoined = players.length === 2;

  const copyRoomIdToClipboard = () => {
    navigator.clipboard.writeText(roomId).then(() => toast.success('Đã sao chép ID phòng!')).catch(()=>{});
  };

  const copyInviteLinkToClipboard = () => {
    const inviteLink = window.location.origin + '/game?room=' + roomId;
    navigator.clipboard.writeText(inviteLink).then(() => toast.success('Đã sao chép link mời!')).catch(()=>{});
  };

  const gameRoomClasses = `min-h-screen transition-colors duration-500 ${
    isDarkTheme ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-purple-800 to-indigo-900 text-white'
  }`;

  const isMobile = isMobileDevice();
  const config = getGameConfig(grid.length, isMobile);

  // --- Render ---
  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4">
        <div className="text-center p-8 bg-white bg-opacity-10 rounded-2xl shadow-xl border border-opacity-20 border-white max-w-sm w-full space-y-4">
          <h2 className="text-3xl font-bold mb-4 text-gradient">Chào mừng, {username}!</h2>
          
          <div className="flex items-center justify-center space-x-2 bg-yellow-500 bg-opacity-20 rounded-full px-4 py-2 mb-4">
            <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
            <span className="text-xl font-bold text-yellow-300">{userCoins} xu</span>
          </div>
          
          <p className="text-gray-200">Bạn đã sẵn sàng tham gia phòng chơi chưa?</p>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <label className="text-gray-200">Chọn màu của bạn:</label>
              <input
                type="color"
                value={myColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-10 rounded-full border-2 border-white cursor-pointer"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="block text-gray-200">Mức độ:</label>
              <select
                value={difficulty}
                onChange={joinRoomId ? undefined : (e) => setDifficulty(e.target.value)}
                disabled={!!joinRoomId}
                className={`w-full px-4 py-2 bg-white bg-opacity-20 rounded-full text-white focus:outline-none transition duration-300 ${
                  joinRoomId 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'focus:ring-2 focus:ring-pink-400 cursor-pointer'
                }`}
              >
                <option className="text-black" value="easy">Dễ (1-100)</option>
                <option className="text-black" value="medium">Trung bình (1-150)</option>
                <option className="text-black" value="hard">Khó (1-200)</option>
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="block text-gray-200">Chế độ chơi:</label>
              <select
                value={mode}
                onChange={joinRoomId ? undefined : (e) => setMode(e.target.value)}
                disabled={!!joinRoomId}
                className={`w-full px-4 py-2 bg-white bg-opacity-20 rounded-full text-white focus:outline-none transition duration-300 ${
                  joinRoomId 
                    ? 'cursor-not-allowed opacity-60' 
                    : 'focus:ring-2 focus:ring-pink-400 cursor-pointer'
                }`}
              >
                <option className="text-black" value="shuffle">Đảo vị trí</option>
                <option className="text-black" value="keep">Giữ nguyên vị trí</option>
              </select>
            </div>

            {!joinRoomId && (
              <>
                <button onClick={handleCreateRoom} className="btn-create w-full">
                  <PlayIcon className="h-5 w-5 mr-2 inline-block" /> Tạo phòng mới
                </button>
                <p className="text-gray-200">hoặc</p>
              </>
            )}
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                placeholder="Nhập ID phòng"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className="w-full px-4 py-2 bg-white bg-opacity-20 rounded-full text-white placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 transition duration-300"
              />
              <button onClick={handleJoinRoom} className="btn-join flex-shrink-0">
                <UserIcon className="h-5 w-5 mr-2 inline-block" /> Tham gia
              </button>
            </div>

            <button onClick={() => navigate('/choose-mode')} className="btn-leave w-full">⬅️ Quay lại chọn chế độ</button>
            <button onClick={() => navigate('/leaderboard')} className="btn-start w-full">🏆 Xem Bảng xếp hạng</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={gameRoomClasses}>
      {/* Desktop view - giữ nguyên */}
      {!isMobile && (
        <div className="flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gradient-game mb-2">Number Game</h1>
          <p className="text-lg md:text-xl text-gray-200 mb-4">{message}</p>
          
          {roomId && (
            <div className="mb-4 space-y-2 text-center w-full max-w-md">
              <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-lg border border-opacity-20 border-white">
                <p className="text-lg font-bold">ID Phòng: <span className="text-pink-300">{roomId}</span></p>
                {isPlayerCreator && !secondPlayerJoined && (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                    <button onClick={copyRoomIdToClipboard} className="btn-copy-link w-full">
                      <ClipboardIcon className="h-5 w-5 mr-2 inline-block" /> Sao chép ID
                    </button>
                    <button onClick={copyInviteLinkToClipboard} className="btn-copy-link w-full">
                      <ClipboardIcon className="h-5 w-5 mr-2 inline-block" /> Sao chép Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center space-x-4">
            <button onClick={handleThemeToggle} className="p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition duration-300">
              {isDarkTheme ? <SunIcon className="h-8 w-8 text-yellow-400" /> : <MoonIcon className="h-8 w-8 text-blue-300" />}
            </button>
            <div className="flex flex-col items-center">
              <label className="text-gray-200 text-sm">Chọn màu của bạn:</label>
              <input
                type="color"
                value={myColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-10 rounded-full border-2 border-white cursor-pointer"
              />
            </div>
          </div>

          <div className="w-full max-w-4xl bg-white bg-opacity-10 p-4 md:p-8 rounded-3xl shadow-2xl backdrop-filter backdrop-blur-lg border border-opacity-20 border-white space-y-6">
            <div className="flex flex-col sm:flex-row justify-around text-center mb-6 space-y-4 sm:space-y-0">
              {players.map(player => (
                <div key={player.id} className="flex flex-col items-center p-4 rounded-xl shadow-md transition-all duration-300">
                  <UserIcon className="h-8 md:h-10 w-8 md:w-10 mb-2" style={{ color: player.color }} />
                  <h3 className="text-lg md:text-xl font-bold">{player.username}</h3>
                  <p className="text-md md:text-lg">Score: {player.score}</p>
                  
                  <div className="flex items-center space-x-1 mt-2 bg-yellow-500 bg-opacity-20 rounded-full px-3 py-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-300">{player.coins || 50}</span>
                  </div>
                  
                  {secondPlayerJoined && player.isReady && (
                    <CheckCircleIcon className="h-6 w-6 text-green-400 mt-2" />
                  )}
                </div>
              ))}
            </div>

            {!gameStarted && hasJoined && secondPlayerJoined && isPlayerCreator && (
              <div className="flex justify-center mt-4">
                <button onClick={handleStartGame} className="btn-start w-48">
                  <PlayIcon className="h-5 w-5 mr-2 inline-block" /> Bắt đầu
                </button>
              </div>
            )}

            {gameStarted && (
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold mb-4">
                  Tìm số tiếp theo: <span className="text-pink-400 glowing-text">{nextNumber}</span>
                </p>
                <div 
                  ref={gameContainerRef} 
                  className="game-container notebook-paper-background relative mx-auto rounded-xl overflow-hidden"
                  style={{
                    width: grid.length <= 100 ? '600px' : grid.length <= 150 ? '750px' : '900px',
                    height: grid.length <= 100 ? '500px' : grid.length <= 150 ? '600px' : '700px',
                    maxWidth: '100%',
                    transition: 'width 0.5s ease, height 0.5s ease'
                  }}
                >
                  {positions.map(pos => {
                    const foundById = foundNumbers[pos.number];
                    const foundColor = foundById ? getPlayerColorById(foundById) : null;
                    const defaultTextColor = '#1a202c';
                    const textColor = foundColor || defaultTextColor;
                    
                    return (
                      <div
                        key={pos.number}
                        onClick={() => handleNumberClick(pos.number)}
                        className="game-numbers-font absolute select-none"
                        style={{
                          left: 0,
                          top: 0,
                          transform: `translate(${pos.x}px, ${pos.y}px)`,
                          transition: 'transform 1.05s cubic-bezier(0.25,0.8,0.25,1), color 0.5s ease',
                          willChange: 'transform, color',
                          width: '56px',
                          height: '56px',
                          lineHeight: '56px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: textColor,
                          background: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                          pointerEvents: 'auto'
                        }}
                        aria-label={`number-${pos.number}`}
                      >
                        <span style={{ 
                          fontWeight: 900, 
                          fontSize: '20px',
                          textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)'
                        }}>{pos.number}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLeaveRoom} className="mt-4 btn-leave">
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 inline-block" /> Thoát
          </button>
        </div>
      )}

      {/* Mobile view - tối ưu */}
      {isMobile && !gameStarted && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-3xl font-extrabold text-gradient-game mb-4">Number Game</h1>
          <p className="text-lg text-gray-200 mb-4">{message}</p>
          
          {roomId && (
            <div className="mb-4 w-full max-w-sm">
              <div className="bg-white bg-opacity-10 p-3 rounded-xl shadow-lg border border-opacity-20 border-white text-center">
                <p className="text-sm font-bold">ID: <span className="text-pink-300">{roomId}</span></p>
                {isPlayerCreator && !secondPlayerJoined && (
                  <div className="flex space-x-2 mt-2">
                    <button onClick={copyRoomIdToClipboard} className="btn-copy-link flex-1 text-xs py-2">
                      <ClipboardIcon className="h-4 w-4 inline-block" /> ID
                    </button>
                    <button onClick={copyInviteLinkToClipboard} className="btn-copy-link flex-1 text-xs py-2">
                      <ClipboardIcon className="h-4 w-4 inline-block" /> Link
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="w-full max-w-sm bg-white bg-opacity-10 p-4 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-around">
              {players.map(player => (
                <div key={player.id} className="flex flex-col items-center">
                  <UserIcon className="h-8 w-8 mb-1" style={{ color: player.color }} />
                  <h3 className="text-sm font-bold">{player.username}</h3>
                  <p className="text-xs">Score: {player.score}</p>
                  <div className="flex items-center space-x-1 mt-1 bg-yellow-500 bg-opacity-20 rounded-full px-2 py-0.5">
                    <CurrencyDollarIcon className="h-3 w-3 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-300">{player.coins || 50}</span>
                  </div>
                  {secondPlayerJoined && player.isReady && (
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mt-1" />
                  )}
                </div>
              ))}
            </div>

            {!gameStarted && hasJoined && secondPlayerJoined && isPlayerCreator && (
              <div className="flex justify-center">
                <button onClick={handleStartGame} className="btn-start px-6 py-2">
                  <PlayIcon className="h-5 w-5 mr-2 inline-block" /> Bắt đầu
                </button>
              </div>
            )}
          </div>

          <button onClick={handleLeaveRoom} className="mt-4 btn-leave px-6 py-2">
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 inline-block" /> Thoát
          </button>
        </div>
      )}

      {/* Mobile game view - Full screen */}
      {isMobile && gameStarted && (
        <div className="fixed inset-0 flex flex-col" style={{ height: '100vh', width: '100vw' }}>
          {/* Floating back button */}
          <button 
            onClick={handleLeaveRoom}
            className="fixed top-2 left-2 z-50 bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white rounded-full p-2 shadow-lg transition-all duration-300"
            style={{ width: '40px', height: '40px' }}
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </button>

          {/* Players info - compact top right */}
          <div className="fixed top-2 right-2 z-40 flex space-x-2">
            {players.map(player => (
              <div key={player.id} className="bg-white bg-opacity-10 rounded-lg p-2 backdrop-blur-sm">
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: player.color }}
                  ></div>
                  <span className="text-xs font-bold">{player.username}</span>
                </div>
                <div className="text-xs text-center">{player.score}</div>
              </div>
            ))}
          </div>

          {/* Next Number - compact */}
          <div className="flex-shrink-0 text-center pt-12 pb-2 px-2 bg-gradient-to-b from-purple-900 to-transparent">
            <div className="text-lg font-bold">
              Số: <span className="text-pink-400 text-2xl">{nextNumber}</span>
            </div>
          </div>

          {/* Game Container - Full remaining space */}
          <div className="flex-1 relative" style={{ minHeight: 0 }}>
            <div 
              ref={gameContainerRef} 
              className="absolute inset-0 notebook-paper-background"
              style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              {positions.map(pos => {
                const foundById = foundNumbers[pos.number];
                const foundColor = foundById ? getPlayerColorById(foundById) : null;
                const defaultTextColor = '#1a202c';
                const textColor = foundColor || defaultTextColor;
                
                return (
                  <div
                    key={pos.number}
                    onClick={() => handleNumberClick(pos.number)}
                    className="game-numbers-font absolute select-none"
                    style={{
                      left: 0,
                      top: 0,
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      transition: 'transform 1.05s cubic-bezier(0.25,0.8,0.25,1), color 0.5s ease',
                      willChange: 'transform, color',
                      width: `${config.itemSize}px`,
                      height: `${config.itemSize}px`,
                      lineHeight: `${config.itemSize}px`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      color: textColor,
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      pointerEvents: 'auto',
                      touchAction: 'manipulation'
                    }}
                    aria-label={`number-${pos.number}`}
                  >
                    <span style={{ 
                      fontWeight: 900, 
                      fontSize: `${config.fontSize}px`,
                      textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.15)'
                    }}>{pos.number}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoomPage;