import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  PlayIcon, ArrowLeftOnRectangleIcon, SunIcon, MoonIcon, 
  CurrencyDollarIcon, BookmarkIcon
} from '@heroicons/react/24/solid';
import { 
  saveSoloGame, 
  getSavedSoloGame, 
  deleteSavedSoloGame,
  markGameCompleted,
  finishSoloGame,
  getUserCoins // ⭐ THÊM IMPORT
} from '../services/api';
import '../custom.css';

const isMobileDevice = () => window.innerWidth <= 768;

const SoloGamePage = () => {
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState('shuffle');
  const [myColor, setMyColor] = useState('#FF5733');
  const [grid, setGrid] = useState([]);
  const [positions, setPositions] = useState([]);
  const [foundNumbers, setFoundNumbers] = useState({});
  const [nextNumber, setNextNumber] = useState(1);
  const [timeMs, setTimeMs] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasConfigured, setHasConfigured] = useState(false);
  const [username, setUsername] = useState('');
  const [userCoins, setUserCoins] = useState(50);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  
  const gameContainerRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // ⭐ HÀM FETCH COINS TỪ SERVER
  const fetchUserCoins = async () => {
    try {
      const response = await getUserCoins();
      setUserCoins(response.data.coins || 50);
      console.log('✅ Coins updated from server:', response.data.coins);
    } catch (err) {
      console.error('❌ Error fetching coins:', err);
    }
  };

  const formatTime = (ms) => {
    if (ms == null) return '--:--:--';
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${mm}:${ss}.${cs}`;
  };

  const getGameConfig = (totalNumbers, isMobile) => {
    if (!isMobile) {
      return { itemSize: 56, fontSize: 20, minDistanceMultiplier: 0.6 };
    }
    if (totalNumbers <= 50) {
      return { itemSize: 37, fontSize: 28, minDistanceMultiplier: 0.75 };
    } else if (totalNumbers <= 150) {
      return { itemSize: 34, fontSize: 17, minDistanceMultiplier: 0.7 };
    } else {
      return { itemSize: 30, fontSize: 15, minDistanceMultiplier: 0.65 };
    }
  };

  const generateRandomPositions = useCallback((shouldShuffle = false) => {
    if (!gameStarted || !grid || grid.length === 0 || !gameContainerRef.current) return;
    
    const totalNumbers = grid.length;
    const isMobile = isMobileDevice();
    const config = getGameConfig(totalNumbers, isMobile);
    
    let containerWidth, containerHeight;
    
    if (isMobile) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      containerWidth = screenWidth;
      containerHeight = screenHeight - 120;
    } else {
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

  // Check for saved game on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUsername(payload.user.username);
      
      // ⭐ FETCH COINS KHI LOAD TRANG
      fetchUserCoins();
      
      // Check for saved game
      checkForSavedGame();
    } catch (err) {
      console.error('Invalid token', err);
      navigate('/');
      return;
    }
  }, [navigate]);

  const checkForSavedGame = async () => {
    try {
      const response = await getSavedSoloGame();
      if (response.data.hasSavedGame) {
        setHasSavedGame(true);
      }
    } catch (err) {
      console.error('Error checking saved game:', err);
    }
  };

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartConfiguration = () => {
    setHasConfigured(true);
  };

  const handleStartGame = () => {
    let total = 50;
    if (difficulty === 'medium') total = 100;
    if (difficulty === 'hard') total = 150;
    const numbers = Array.from({ length: total }, (_, i) => i + 1);
    setGrid(numbers);
    setNextNumber(1);
    setFoundNumbers({});
    setGameStarted(true);
    setTimeMs(0);
    setPositions([]);
    setIsResuming(false);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeMs((prev) => prev + 100);
    }, 100);
  };

  const handleResumeGame = async () => {
    try {
      const response = await getSavedSoloGame();
      if (!response.data.hasSavedGame) {
        toast.error('Không tìm thấy game đã lưu!');
        return;
      }

      const saved = response.data.savedGame;
      
      // Restore game state
      setDifficulty(saved.difficulty);
      setMode(saved.mode);
      setMyColor(saved.myColor);
      setGrid(saved.grid);
      setPositions(saved.positions);
      setFoundNumbers(saved.foundNumbers);
      setNextNumber(saved.nextNumber);
      setTimeMs(saved.timeMs);
      setIsDarkTheme(saved.isDarkTheme);
      setGameStarted(true);
      setHasConfigured(true);
      setIsResuming(true);
      setHasSavedGame(false);

      // Resume timer from saved time
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeMs((prev) => prev + 100);
      }, 100);

      toast.success('Đã load game thành công!');
    } catch (err) {
      console.error('Error resuming game:', err);
      toast.error('Lỗi khi load game!');
    }
  };

  const handleSaveGame = async () => {
    if (!gameStarted) {
      toast.warn('Không có game nào để lưu!');
      return;
    }

    try {
      const gameData = {
        difficulty,
        mode,
        myColor,
        grid,
        positions,
        foundNumbers,
        nextNumber,
        timeMs,
        isDarkTheme
      };

      await saveSoloGame(gameData);
      toast.success('✅ Đã lưu game thành công!');
      
      // Stop timer and return to config
      if (timerRef.current) clearInterval(timerRef.current);
      setGameStarted(false);
      setHasConfigured(false);
      setPositions([]);
      setHasSavedGame(true);
      
    } catch (err) {
      console.error('Error saving game:', err);
      toast.error('Lỗi khi lưu game!');
    }
  };

  const handleNumberClick = async (num) => {
    if (num !== nextNumber || !gameStarted) {
      if (!gameStarted) {
        toast.warn('Trò chơi chưa bắt đầu!');
      }
      return;
    }
    setFoundNumbers((prev) => ({ ...prev, [num]: true }));
    const next = nextNumber + 1;
    setNextNumber(next);
    if (mode === 'shuffle') {
      setTimeout(() => generateRandomPositions(true), 100);
    }
    if (next > grid.length) {
      setGameStarted(false);
      if (timerRef.current) clearInterval(timerRef.current);
      
      try {
        // Mark game as completed
        await markGameCompleted('solo');
        
        // Save best time
        await finishSoloGame({ timeMs, difficulty, mode });
        
        toast.success(`🎉 Hoàn thành trong ${formatTime(timeMs)}! Kết quả đã được lưu!`);
        
        // Delete saved game
        if (isResuming) {
          await deleteSavedSoloGame();
          setHasSavedGame(false);
        }
        
        // ⭐ FETCH COINS SAU KHI HOÀN THÀNH (nếu có thay đổi)
        await fetchUserCoins();
      } catch (err) {
        console.error(err);
        toast.error(err.response?.data?.msg || 'Không thể lưu kết quả');
      }
    }
  };

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleBackToConfig = () => {
    if (gameStarted) {
      setGameStarted(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setHasConfigured(false);
    setPositions([]);
    setGrid([]);
    setFoundNumbers({});
    setNextNumber(1);
    setTimeMs(0);
    setIsResuming(false);
  };

  const gameRoomClasses = `min-h-screen transition-colors duration-500 ${
    isDarkTheme ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-purple-800 to-indigo-900 text-white'
  }`;

  if (!hasConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4">
        <div className="text-center p-8 bg-white bg-opacity-10 rounded-2xl shadow-xl border border-opacity-20 border-white max-w-sm w-full space-y-4">
          <h2 className="text-3xl font-bold mb-4 text-gradient">Chào mừng, {username}!</h2>
          
          <div className="flex items-center justify-center space-x-2 bg-yellow-500 bg-opacity-20 rounded-full px-4 py-2 mb-4">
            <CurrencyDollarIcon className="h-6 w-6 text-yellow-400" />
            <span className="text-xl font-bold text-yellow-300">{userCoins} xu</span>
          </div>
          
          <p className="text-gray-200">Cấu hình trò chơi một mình</p>
          
          {hasSavedGame && (
            <button onClick={handleResumeGame} className="btn-join w-full">
              🔄 Chơi tiếp ván đã lưu
            </button>
          )}
          
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <label className="text-gray-200">Chọn màu của bạn:</label>
              <input
                type="color"
                value={myColor}
                onChange={(e) => setMyColor(e.target.value)}
                className="h-10 w-10 rounded-full border-2 border-white cursor-pointer"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="block text-gray-200">Mức độ:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 bg-white bg-opacity-20 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer transition duration-300"
              >
                <option className="text-black" value="easy">Dễ (1-50)</option>
                <option className="text-black" value="medium">Trung bình (1-100)</option>
                <option className="text-black" value="hard">Khó (1-150)</option>
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="block text-gray-200">Chế độ chơi:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-4 py-2 bg-white bg-opacity-20 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-pink-400 cursor-pointer transition duration-300"
              >
                <option className="text-black" value="shuffle">Đảo vị trí</option>
                <option className="text-black" value="keep">Giữ nguyên vị trí</option>
              </select>
            </div>
            <button onClick={handleStartConfiguration} className="btn-create w-full">
              <PlayIcon className="h-5 w-5 mr-2 inline-block" /> Bắt đầu chơi
            </button>
            <button onClick={() => navigate('/choose-mode')} className="btn-leave w-full">
              ⬅️ Quay lại chọn chế độ
            </button>
            <button onClick={() => navigate('/leaderboard')} className="btn-start w-full">
              🏆 Xem Bảng xếp hạng
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = isMobileDevice();
  const config = getGameConfig(grid.length, isMobile);

  return (
    <div className={gameRoomClasses}>
      {!isMobile && (
        <div className="flex flex-col items-center justify-center p-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gradient-game mb-2">Number Game</h1>
          <p className="text-lg md:text-xl text-gray-200 mb-2">Chế độ chơi một mình</p>
          
          {gameStarted && (
            <div className="text-base md:text-lg text-gray-200 mb-3">
              Thời gian: <span className="font-mono text-pink-300">{formatTime(timeMs)}</span>
            </div>
          )}
          
          <div className="mb-3 flex items-center space-x-3">
            <button onClick={handleThemeToggle} className="p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition duration-300">
              {isDarkTheme ? <SunIcon className="h-6 w-6 md:h-8 md:w-8 text-yellow-400" /> : <MoonIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-300" />}
            </button>
            
            {gameStarted && (
              <button 
                onClick={handleSaveGame} 
                className="p-2 rounded-full bg-green-500 bg-opacity-20 hover:bg-opacity-40 transition duration-300"
                title="Lưu game"
              >
                <BookmarkIcon className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
              </button>
            )}
            
            <div className="flex flex-col items-center">
              <label className="text-gray-200 text-xs md:text-sm">Màu:</label>
              <input
                type="color"
                value={myColor}
                onChange={(e) => setMyColor(e.target.value)}
                className="h-8 w-8 md:h-10 md:w-10 rounded-full border-2 border-white cursor-pointer"
              />
            </div>
          </div>
          
          <div className="w-full max-w-4xl bg-white bg-opacity-10 p-3 md:p-8 rounded-3xl shadow-2xl backdrop-filter backdrop-blur-lg border border-opacity-20 border-white space-y-4">
            <div className="flex justify-center text-center mb-4">
              <div className="flex flex-col items-center p-3 md:p-4 rounded-xl shadow-md transition-all duration-300">
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: myColor }}
                  ></div>
                  <h3 className="text-lg md:text-xl font-bold">{username}</h3>
                </div>
                <p className="text-base md:text-lg">Điểm: {Object.keys(foundNumbers).length}</p>
                
                <div className="flex items-center space-x-1 mt-2 bg-yellow-500 bg-opacity-20 rounded-full px-2 md:px-3 py-1">
                  <CurrencyDollarIcon className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />
                  <span className="text-xs md:text-sm font-bold text-yellow-300">{userCoins}</span>
                </div>
              </div>
            </div>
            
            {!gameStarted && hasConfigured && (
              <div className="flex justify-center mt-4">
                <button onClick={handleStartGame} className="btn-start w-40 md:w-48">
                  <PlayIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 inline-block" /> Bắt đầu
                </button>
              </div>
            )}
            
            {gameStarted && (
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold mb-3 md:mb-4">
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
                    const foundColor = foundById ? myColor : null;
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
                          borderRadius: '8px',
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
                          fontSize: `${config.fontSize}px`,
                          textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)'
                        }}>{pos.number}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <button onClick={handleBackToConfig} className="mt-3 btn-leave text-sm md:text-base">
            <ArrowLeftOnRectangleIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 inline-block" /> Quay lại cấu hình
          </button>
        </div>
      )}

      {isMobile && !gameStarted && hasConfigured && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-3xl font-extrabold text-gradient-game mb-4">Number Game</h1>
          <button onClick={handleStartGame} className="btn-start px-8 py-3">
            <PlayIcon className="h-5 w-5 mr-2 inline-block" /> Bắt đầu
          </button>
          <button onClick={handleBackToConfig} className="mt-3 btn-leave px-6 py-2">
            <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 inline-block" /> Quay lại
          </button>
        </div>
      )}

      {isMobile && gameStarted && (
        <div className="fixed inset-0 flex flex-col" style={{ height: '100vh', width: '100vw' }}>
          <button 
            onClick={handleBackToConfig}
            className="fixed top-2 left-2 z-50 bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white rounded-full p-2 shadow-lg transition-all duration-300"
            style={{ width: '40px', height: '40px' }}
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          </button>
          
          <button 
            onClick={handleSaveGame}
            className="fixed top-2 right-2 z-50 bg-green-500 bg-opacity-80 hover:bg-opacity-100 text-white rounded-full p-2 shadow-lg transition-all duration-300"
            style={{ width: '40px', height: '40px' }}
            title="Lưu game"
          >
            <BookmarkIcon className="h-5 w-5" />
          </button>

          <div className="flex-shrink-0 text-center pt-12 pb-2 px-2 bg-gradient-to-b from-purple-900 to-transparent">
            <div className="text-sm font-mono text-pink-300 mb-1">{formatTime(timeMs)}</div>
            <div className="text-lg font-bold">
              Số: <span className="text-pink-400 text-2xl">{nextNumber}</span>
            </div>
          </div>

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
                const foundColor = foundById ? myColor : null;
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

export default SoloGamePage;
