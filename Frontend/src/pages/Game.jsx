import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuestionRenderer from "../components/QuestionRenderer";
import confetti from "canvas-confetti";
import "./Game.css";

const STORAGE_KEY = "treasure_hunt_session_v1";

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const certificateCanvasRef = useRef(null);
  const socialCardCanvasRef = useRef(null);
  const quitFlyerCanvasRef = useRef(null);
  
  const playerNameFromRoute = location.state?.playerName || "Hunter";
  const playerKeyFromRoute = location.state?.playerKey || null;
  
  // State management
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState({});
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [startTime] = useState(Date.now());
  const [finalTime, setFinalTime] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);
  const [playerName] = useState(playerNameFromRoute);
  const [showClue, setShowClue] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [gameQuit, setGameQuit] = useState(false);
  const [quitTime, setQuitTime] = useState(null);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);

  const getQuestionId = (q) => q?._id ?? q?.code ?? null;

  // 🆕 Prevent page refresh/close during active game
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!gameFinished && !gameQuit && sessionId) {
        const message = 'Your game progress will be lost if you leave. Are you sure?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameFinished, gameQuit, sessionId]);

  // 🆕 Detect refresh attempts and show warning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        !gameFinished && 
        !gameQuit && 
        sessionId && 
        (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5')
      ) {
        e.preventDefault();
        setShowRefreshWarning(true);
        
        setTimeout(() => {
          setShowRefreshWarning(false);
        }, 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameFinished, gameQuit, sessionId]);

  // 🆕 Prevent back button navigation
  useEffect(() => {
    if (!gameFinished && !gameQuit && sessionId) {
      const currentState = { preventBack: true };
      window.history.pushState(currentState, '', window.location.href);

      const handlePopState = () => {
        if (!gameFinished && !gameQuit) {
          setShowQuitModal(true);
          window.history.pushState(currentState, '', window.location.href);
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [gameFinished, gameQuit, sessionId]);

  // Initialize game session
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setLoading(true);
        
        const startRes = await fetch("http://localhost:4000/api/game/start", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerKey: playerKeyFromRoute 
          })
        });

        if (!startRes.ok) {
          throw new Error('Failed to start game');
        }

        const startData = await startRes.json();
        
        if (!startData.sessionId) {
          throw new Error('No session ID received');
        }

        console.log('Game session started:', startData.sessionId);
        setSessionId(startData.sessionId);
        setTotalQuestions(startData.totalQuestions || 10);

      } catch (err) {
        console.error("Failed to initialize game:", err);
        setError("Failed to start game. Please try again.");
        setLoading(false);
      }
    };

    initializeGame();
  }, []);

  // Fetch current question
  useEffect(() => {
    if (!sessionId) {
      console.log('Waiting for session ID...');
      return;
    }

    const loadCurrentQuestion = async () => {
      try {
        setLoading(true);
        
        console.log(`Fetching question ${current} for session ${sessionId}`);
        
        const res = await fetch(`http://localhost:4000/api/game/question/${current}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId 
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load question');
        }

        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else {
          setQuestions(prev => {
            const updated = [...prev];
            updated[current] = data.question;
            return updated;
          });
          setTotalQuestions(data.totalQuestions || 10);
        }
      } catch (err) {
        console.error("Failed to load question:", err);
        setError(err.message || "Failed to load question");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentQuestion();
  }, [sessionId, current]);

  // Load leaderboard
  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await fetch("http://localhost:4000/api/leaderboard");
        const data = await res.json();

        if (Array.isArray(data)) setLeaderboard(data);
        else if (Array.isArray(data?.leaderboard)) setLeaderboard(data.leaderboard);
        else if (Array.isArray(data?.data)) setLeaderboard(data.data);
        else setLeaderboard([]);
      } catch (err) {
        console.error("Failed leaderboard:", err);
        setLeaderboard([]);
      }
    };

    loadBoard();
  }, []);

  // Reset clue when question changes
  useEffect(() => {
    setShowClue(false);
  }, [current]);

  // Generate certificates when game finishes
  useEffect(() => {
    if (gameFinished && finalTime) {
      setTimeout(() => {
        generateCertificate();
        generateSocialCard();
      }, 500);
    }
  }, [gameFinished, finalTime]);

  // Generate quit flyer
  useEffect(() => {
    if (gameQuit && quitTime) {
      setTimeout(() => {
        generateQuitFlyer();
      }, 500);
    }
  }, [gameQuit, quitTime]);

  // Quit handlers
  const handleQuitGame = () => {
    setShowQuitModal(true);
  };

  const confirmQuit = () => {
    const endTime = Date.now();
    const timePlayed = Math.floor((endTime - startTime) / 1000);
    
    setQuitTime(timePlayed);
    setGameQuit(true);
    setShowQuitModal(false);
  };

  const cancelQuit = () => {
    setShowQuitModal(false);
  };

  // Get rank based on time
  const getRank = (seconds) => {
    if (seconds < 180) return { name: 'Legend', emoji: '⭐', color: '#fbbf24' };
    if (seconds < 300) return { name: 'Master', emoji: '💎', color: '#06b6d4' };
    if (seconds < 600) return { name: 'Expert', emoji: '🔥', color: '#22c55e' };
    if (seconds < 900) return { name: 'Hunter', emoji: '🎯', color: '#3b82f6' };
    return { name: 'Adventurer', emoji: '🗺️', color: '#8b5cf6' };
  };

  // Generate Certificate
// Generate Professional Certificate
const generateCertificate = () => {
  const canvas = certificateCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = 1200;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  // Professional gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.3, '#1e293b');
  gradient.addColorStop(0.7, '#1e3a5f');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Elegant outer border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 12;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Inner decorative border
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, width - 100, height - 100);

  // Second inner border
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(55, 55, width - 110, height - 110);

  // Decorative corner accents
  const drawCornerAccent = (x, y, rotation) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(40, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 40);
    ctx.stroke();
    ctx.restore();
  };

  drawCornerAccent(80, 80, 0);
  drawCornerAccent(width - 80, 80, Math.PI / 2);
  drawCornerAccent(width - 80, height - 80, Math.PI);
  drawCornerAccent(80, height - 80, -Math.PI / 2);

  // Header ribbon background
  ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
  ctx.fillRect(100, 110, width - 200, 90);

  // Trophy icon
  ctx.font = '64px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏆', width / 2, 170);

  // Main title - CERTIFICATE OF ACHIEVEMENT
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 52px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF ACHIEVEMENT', width / 2, 260);

  // Decorative line under title
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(350, 280);
  ctx.lineTo(850, 280);
  ctx.stroke();

  // "This certifies that" text
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 28px Georgia';
  ctx.fillText('This certifies that', width / 2, 330);

  // Player name - PROMINENT
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Georgia';
  ctx.fillText(playerName, width / 2, 400);

  // Decorative underline for name
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const nameWidth = ctx.measureText(playerName).width;
  ctx.moveTo((width - nameWidth) / 2, 415);
  ctx.lineTo((width + nameWidth) / 2, 415);
  ctx.stroke();

  // Achievement description
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '26px Georgia';
  ctx.fillText('has successfully completed the', width / 2, 460);

  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 32px Georgia';
  ctx.fillText('TREASURE HUNT CHALLENGE', width / 2, 500);

  // Achievement details box
  ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
  ctx.fillRect(200, 530, width - 400, 120);
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(200, 530, width - 400, 120);

  // Stats in the box
  const rank = getRank(finalTime);
  const completionTime = formatTime(finalTime);
  const completionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px Arial';
  ctx.textAlign = 'left';

  // Left column
  ctx.fillText('Completion Time:', 250, 575);
  ctx.fillText('Questions Cleared:', 250, 610);
  
  // Right column - values
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(completionTime, width - 250, 575);
  ctx.fillText(`${totalQuestions} Questions`, width - 250, 610);

  // Rank badge
  ctx.fillStyle = rank.color;
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${rank.emoji} ${rank.name} Rank`, width / 2, 640);

  // Date
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 20px Georgia';
  ctx.fillText(`Awarded on ${completionDate}`, width / 2, 700);

  // Footer with session ID
  ctx.fillStyle = '#475569';
  ctx.font = '16px Courier New';
  ctx.fillText(`Certificate ID: ${sessionId?.slice(0, 20)}`, width / 2, 750);

  // Signature line (decorative)
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 100, 735);
  ctx.lineTo(width / 2 + 100, 735);
  ctx.stroke();
};


  // Generate Social Card
// Generate Professional Social Media Card
const generateSocialCard = () => {
  const canvas = socialCardCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;

  // Modern gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.5, '#1e3a5f');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Geometric background patterns
  ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
  ctx.beginPath();
  ctx.arc(100, 100, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
  ctx.beginPath();
  ctx.arc(1100, 530, 200, 0, Math.PI * 2);
  ctx.fill();

  // Decorative accent bars
  ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
  ctx.fillRect(0, 0, 8, height);
  ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
  ctx.fillRect(width - 8, 0, 8, height);

  // Left side: Trophy and achievement
  ctx.font = '140px Arial';
  ctx.fillText('🏆', 120, 200);

  // Main content area
  const contentX = 320;

  // Badge/Label at top
  ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
  ctx.fillRect(contentX - 10, 60, 480, 45);
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('ACHIEVEMENT UNLOCKED', contentX + 10, 92);

  // Main headline
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Arial';
  ctx.fillText('Treasure Hunt', contentX, 165);
  
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 64px Arial';
  ctx.fillText('Completed!', contentX, 230);

  // Player name with styling
  ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
  ctx.fillRect(contentX - 10, 250, 600, 60);
  
  ctx.fillStyle = '#d4af37';
  ctx.font = 'italic bold 36px Georgia';
  ctx.fillText(`By ${playerName}`, contentX + 10, 288);

  // Stats card - elevated design
  const statsX = contentX;
  const statsY = 340;
  const statsWidth = 750;
  const statsHeight = 220;

  // Shadow for depth
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(statsX + 5, statsY + 5, statsWidth, statsHeight);

  // Main stats card
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(statsX, statsY, statsWidth, statsHeight);
  
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 3;
  ctx.strokeRect(statsX, statsY, statsWidth, statsHeight);

  // Stats content
  const rank = getRank(finalTime);
  
  // Grid layout for stats
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';

  // Column 1 - Labels
  const labelX = statsX + 30;
  ctx.fillText('COMPLETION TIME', labelX, statsY + 50);
  ctx.fillText('TOTAL QUESTIONS', labelX, statsY + 120);
  ctx.fillText('RANK ACHIEVED', labelX, statsY + 190);

  // Column 2 - Values (large and prominent)
  const valueX = statsX + 280;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(formatTime(finalTime), valueX, statsY + 55);
  ctx.fillText(`${totalQuestions}`, valueX, statsY + 125);
  
  ctx.fillStyle = rank.color;
  ctx.font = 'bold 38px Arial';
  ctx.fillText(`${rank.emoji} ${rank.name}`, valueX, statsY + 195);

  // Divider lines between stats
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(statsX + 20, statsY + 80);
  ctx.lineTo(statsX + statsWidth - 20, statsY + 80);
  ctx.moveTo(statsX + 20, statsY + 150);
  ctx.lineTo(statsX + statsWidth - 20, statsY + 150);
  ctx.stroke();

  // Footer branding
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('TREASURE HUNT CHALLENGE', width / 2, height - 30);
  
  ctx.fillStyle = '#64748b';
  ctx.font = '16px Arial';
  ctx.fillText('Can you beat this score?', width / 2, height - 8);
};


  // Generate Quit Flyer
  const generateQuitFlyer = () => {
    const canvas = quitFlyerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1e1b4b');
    gradient.addColorStop(1, '#312e81');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
    ctx.beginPath();
    ctx.arc(150, 150, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.beginPath();
    ctx.arc(1050, 480, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '100px Arial';
    ctx.fillText('🎮', 80, 140);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('I tried the', 260, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Arial';
    ctx.fillText('Treasure Hunt Challenge!', 260, 200);

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'italic bold 40px Georgia';
    ctx.fillText(`- ${playerName}`, 260, 270);

    ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
    ctx.fillRect(80, 320, 1040, 240);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 320, 1040, 240);

    const correctCount = Object.keys(answeredCorrectly).length;
    const progressPercent = Math.round((current / totalQuestions) * 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillText('📊 My Progress:', 120, 380);
    ctx.fillText(`✅ Answered Correctly: ${correctCount} / ${totalQuestions}`, 120, 430);
    ctx.fillText(`📈 Progress: ${progressPercent}%`, 120, 480);
    ctx.fillText(`⏱️ Time Played: ${formatTime(quitTime)}`, 120, 530);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Can you beat my score? Join the Treasure Hunt!', width / 2, height - 25);
  };

  // Download functions
  const downloadCertificate = () => {
    generateCertificate();
    
    setTimeout(() => {
      const canvas = certificateCanvasRef.current;
      const link = document.createElement('a');
      link.download = `treasure-hunt-certificate-${playerName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 100);
  };

  const downloadSocialCard = () => {
    generateSocialCard();
    
    setTimeout(() => {
      const canvas = socialCardCanvasRef.current;
      const link = document.createElement('a');
      link.download = `treasure-hunt-share-${playerName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 100);
  };

  const downloadQuitFlyer = () => {
    generateQuitFlyer();
    
    setTimeout(() => {
      const canvas = quitFlyerCanvasRef.current;
      const link = document.createElement('a');
      link.download = `treasure-hunt-attempt-${playerName.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 100);
  };

  // Social sharing
  const shareOnTwitter = () => {
    const rank = getRank(finalTime);
    const text = `🏆 I just completed the Treasure Hunt Challenge!\n⏱️ Time: ${formatTime(finalTime)}\n${rank.emoji} Rank: ${rank.name}\n\nCan you beat my score?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareQuitOnTwitter = () => {
    const correctCount = Object.keys(answeredCorrectly).length;
    const text = `🎮 I attempted the Treasure Hunt Challenge!\n✅ Answered: ${correctCount}/${totalQuestions}\n⏱️ Time: ${formatTime(quitTime)}\n\nCan you complete all questions?`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank');
  };

  // Confetti
  const launchConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // Finish game
  const finishGame = async () => {
    const endTime = Date.now();
    const totalSec = Math.floor((endTime - startTime) / 1000);

    setFinalTime(totalSec);
    setGameFinished(true);
    launchConfetti();

    try {
      await fetch("http://localhost:4000/api/leaderboard/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: playerName || sessionId || "Player",
          timeTakenSec: totalSec,
        }),
      });

      const res = await fetch("http://localhost:4000/api/leaderboard");
      const data = await res.json();

      if (Array.isArray(data)) setLeaderboard(data);
      else if (Array.isArray(data?.leaderboard)) setLeaderboard(data.leaderboard);
      else if (Array.isArray(data?.data)) setLeaderboard(data.data);
      else setLeaderboard([]);
    } catch (err) {
      console.error("Error saving time:", err);
    }
  };

  // Alternate question
  const replaceWithAlternate = async (wrongId) => {
    if (!sessionId) return;

    try {
      const res = await fetch(
        `http://localhost:4000/api/game/alternate/${wrongId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId,
            questionIndex: current 
          })
        }
      );

      if (!res.ok) {
        throw new Error('Failed to get alternate');
      }

      const data = await res.json();

      if (!data.question) return;

      setQuestions((prev) => {
        const copy = [...prev];
        copy[current] = data.question;
        return copy;
      });
    } catch (err) {
      console.error("Failed to load alternate question:", err);
      setError("Failed to load alternate question");
    }
  };

  // Answer handler
  const handleAnswerResult = async (questionId, isCorrect, type, fromUser, userAnswer) => {
    const q = questions[current];
    if (!q) return;

    const id = getQuestionId(q);
    if (id !== questionId) return;

    if (fromUser && userAnswer !== undefined) {
      try {
        console.log('Verifying answer on server...', {
          sessionId,
          questionId,
          questionIndex: current,
          answer: userAnswer
        });

        const verifyRes = await fetch(`http://localhost:4000/api/game/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            questionId,
            questionIndex: current,
            answer: userAnswer
          })
        });
        
        const verifyData = await verifyRes.json();
        
        console.log('Server verification result:', verifyData);
        
        if (!verifyData.valid) {
          setError(verifyData.error || "Invalid answer submission");
          return;
        }

        isCorrect = verifyData.correct;
        
      } catch (err) {
        console.error("Failed to verify answer:", err);
        setError("Failed to verify answer");
        return;
      }
    }

    if (isCorrect && fromUser) {
      setAnsweredCorrectly((prev) => ({ ...prev, [current]: true }));
      setCountdown(5);
      launchConfetti();
      return;
    }

    if (!isCorrect && type === "mcq") {
      replaceWithAlternate(questionId);
    }
  };

  // Next question
  const handleNext = () => {
    if (current === totalQuestions - 1) {
      finishGame();
      return;
    }

    if (answeredCorrectly[current]) {
      setCurrent((c) => c + 1);
      setCountdown(0);
      setLoading(true);
    }
  };

  // Auto-next timer
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => {
        setCountdown((v) => v - 1);
        if (countdown === 1) handleNext();
      }, 1000);

      return () => clearTimeout(t);
    }
  }, [countdown]);

  const canProceed = answeredCorrectly[current] === true;

  const progressWidth = useMemo(() => {
    if (!totalQuestions) return 0;
    return ((current + 1) / totalQuestions) * 100;
  }, [current, totalQuestions]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // QUIT SUMMARY SCREEN
  if (gameQuit) {
    const correctCount = Object.keys(answeredCorrectly).length;
    const progressPercent = Math.round((current / totalQuestions) * 100);

    return (
      <div className="game-container quit-summary-state">
        <div className="finish-background">
          <div className="finish-glow"></div>
        </div>

        <canvas ref={quitFlyerCanvasRef} style={{ display: 'none' }} />

        <div className="finish-card quit-card">
          <div className="finish-hero">
            <div className="quit-icon-large">🎮</div>
            <div className="quit-badge">Game Ended</div>
            <h1 className="finish-title">Good Effort, {playerName}!</h1>
            
            <p className="quit-message">
              You gave it a shot! Here's a summary of your attempt.
            </p>
          </div>

          <div className="finish-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <span className="stat-value">{correctCount}</span>
              <span className="stat-label">Questions Answered</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <span className="stat-value">{progressPercent}%</span>
              <span className="stat-label">Progress Made</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <span className="stat-value">{formatTime(quitTime)}</span>
              <span className="stat-label">Time Played</span>
            </div>
          </div>

          <div className="download-section quit-download">
            <h3 className="download-title">📤 Share Your Attempt</h3>
            <p className="download-subtitle">Download your progress card and challenge your friends!</p>
            
            <button onClick={downloadQuitFlyer} className="download-btn-large">
              <span className="btn-icon">📥</span>
              <div className="btn-content">
                <span className="btn-label">Download Progress Card</span>
                <span className="btn-sublabel">Share your attempt on social media</span>
              </div>
            </button>

            <div className="share-buttons">
              <span className="share-label">Quick share:</span>
              <button onClick={shareQuitOnTwitter} className="share-btn twitter-btn">
                <span>🐦 Share on Twitter</span>
              </button>
              <button onClick={shareOnLinkedIn} className="share-btn linkedin-btn">
                <span>💼 Share on LinkedIn</span>
              </button>
            </div>
          </div>

          <div className="motivation-box">
            <h4>💪 Don't Give Up!</h4>
            <p>Every expert was once a beginner. Come back and complete the challenge!</p>
          </div>

          <div className="quit-actions">
            <button 
              className="try-again-btn"
              onClick={() => window.location.href = '/signup'}
            >
              Try Again 🔄
            </button>
            <button 
              className="go-home-btn"
              onClick={() => navigate('/signup')}
            >
              Back to Home 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FINISHED SCREEN
  if (gameFinished) {
    const rank = getRank(finalTime);

    return (
      <div className="game-container finished-state">
        <div className="finish-background">
          <div className="finish-glow"></div>
        </div>

        <canvas ref={certificateCanvasRef} style={{ display: 'none' }} />
        <canvas ref={socialCardCanvasRef} style={{ display: 'none' }} />

        <div className="finish-card">
          <div className="finish-hero">
            <div className="trophy-icon">🏆</div>
            <div className="finish-badge">Treasure Found!</div>
            <h1 className="finish-title">Congratulations, {playerName}!</h1>
            
            <div className="rank-badge-display" style={{ color: rank.color }}>
              <span className="rank-emoji">{rank.emoji}</span>
              <span className="rank-name">{rank.name}</span>
            </div>

            <div className="finish-time-display">
              <span className="time-label">Completion Time</span>
              <span className="time-value">{formatTime(finalTime)}</span>
            </div>

            <div className="finish-prize">
              <div className="prize-icon">🎁</div>
              <p>Show this screen at the top floor of the department building to claim your prize!</p>
            </div>
          </div>

          <div className="finish-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <span className="stat-value">{totalQuestions}</span>
              <span className="stat-label">Questions Cleared</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <span className="stat-value">{Object.keys(answeredCorrectly).length}</span>
              <span className="stat-label">Correct Answers</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <span className="stat-value">{sessionId?.slice(0, 8) || "n/a"}</span>
              <span className="stat-label">Session ID</span>
            </div>
          </div>

          <div className="download-section">
            <h3 className="download-title">📥 Save & Share Your Achievement</h3>
            
            <div className="download-buttons">
              <button onClick={downloadCertificate} className="download-btn certificate-btn">
                <span className="btn-icon">🎓</span>
                <div className="btn-content">
                  <span className="btn-label">Download Certificate</span>
                  <span className="btn-sublabel">Full achievement details</span>
                </div>
              </button>

              <button onClick={downloadSocialCard} className="download-btn social-btn">
                <span className="btn-icon">📱</span>
                <div className="btn-content">
                  <span className="btn-label">Download Social Card</span>
                  <span className="btn-sublabel">Perfect for sharing</span>
                </div>
              </button>
            </div>

            <div className="share-buttons">
              <span className="share-label">Share directly:</span>
              <button onClick={shareOnTwitter} className="share-btn twitter-btn">
                <span>🐦 Twitter</span>
              </button>
              <button onClick={shareOnLinkedIn} className="share-btn linkedin-btn">
                <span>💼 LinkedIn</span>
              </button>
            </div>
          </div>

          <div className="leaderboard-section">
            <div className="leaderboard-header">
              <h3>🏆 Top Hunters</h3>
              <span className="leaderboard-subtitle">Fastest completion times</span>
            </div>
            
            <div className="leaderboard-list">
              {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                leaderboard.map((p, i) => (
                  <div 
                    key={i} 
                    className={`leaderboard-row ${
                      p.playerName === playerName ? 'current-player' : ''
                    } ${i < 3 ? `rank-${i + 1}` : ''}`}
                  >
                    <span className="rank-badge">#{i + 1}</span>
                    <div className="player-info">
                      <span className="player-name">{p.playerName || "Player"}</span>
                      {i === 0 && <span className="crown">👑</span>}
                    </div>
                    <span className="player-time">{formatTime(p.timeTakenSec)}</span>
                  </div>
                ))
              ) : (
                <p className="no-data">No players yet. Be the first!</p>
              )}
            </div>
          </div>

          <button 
            className="play-again-btn"
            onClick={() => window.location.href = '/signup'}
          >
            Play Again 🔄
          </button>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="game-container loading-state">
        <div className="loader">
          <div className="loader-ring"></div>
          <div className="loader-text">
            {sessionId ? `Loading question ${current + 1}...` : 'Starting game...'}
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error || !questions[current]) {
    return (
      <div className="game-container error-state">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h2>Something Went Wrong</h2>
          <p>{error || "Unable to load question. Please try again."}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[current];
  const currentKey = `${current}-${getQuestionId(currentQuestion)}`;

  // ACTIVE GAME UI
  return (
    <div className="game-container active-game">
      <div className="game-background">
        <div className="grid-overlay"></div>
      </div>

      {/* Refresh Warning Banner */}
      {showRefreshWarning && (
        <div className="refresh-warning-banner">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              Refreshing will end your game! Use the Quit button if you want to leave.
            </span>
          </div>
        </div>
      )}

      {/* Quit Modal */}
      {showQuitModal && (
        <div className="modal-overlay" onClick={cancelQuit}>
          <div className="quit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Quit Game?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to quit?</p>
              <p className="modal-warning">You can download a progress card to share your attempt!</p>
              <div className="modal-stats">
                <div className="modal-stat">
                  <span className="stat-label">Current Progress</span>
                  <span className="stat-value">{current + 1} / {totalQuestions}</span>
                </div>
                <div className="modal-stat">
                  <span className="stat-label">Answered Correctly</span>
                  <span className="stat-value">{Object.keys(answeredCorrectly).length}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={cancelQuit} className="modal-btn cancel-btn">
                Continue Playing 🎮
              </button>
              <button onClick={confirmQuit} className="modal-btn quit-btn">
                Quit & Get Progress Card 📥
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-header">
          <div className="progress-info">
            <span className="progress-label">Progress</span>
            <span className="progress-counter">{current + 1} / {totalQuestions}</span>
          </div>
          <button onClick={handleQuitGame} className="quit-game-btn">
            <span className="quit-icon">🚪</span>
            Quit
          </button>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressWidth}%` }}
          >
            <div className="progress-glow"></div>
          </div>
        </div>
      </div>

      <div className="game-layout">
        {/* Main Question Area */}
        <div className="question-section">
          <div className="question-header">
            <h2 className="question-title">
              <span className="question-number">Stage {current + 1}</span>
              <span className="question-code">{currentQuestion?.code || `Q${current + 1}`}</span>
            </h2>
          </div>

          <div className="question-content">
            <QuestionRenderer
              key={currentKey}
              question={currentQuestion}
              sessionId={sessionId}
              currentIndex={current}
              onAnswerResult={handleAnswerResult}
            />
          </div>

          {/* Clue Section */}
          {currentQuestion?.clue && currentQuestion.clue.trim() !== "" && (
            <div className="clue-section">
              <button
                onClick={() => setShowClue(!showClue)}
                className={`clue-toggle ${showClue ? 'active' : ''}`}
              >
                <span className="clue-icon">💡</span>
                {showClue ? "Hide Clue" : "Need a Hint?"}
              </button>

              {showClue && (
                <div className="clue-reveal">
                  <div className="clue-content">
                    <span className="clue-emoji">🕵️</span>
                    <p>{currentQuestion.clue}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auto Next Timer */}
          {canProceed && current < totalQuestions - 1 && countdown > 0 && (
            <div className="auto-next-banner">
              <span className="auto-next-icon">⏱️</span>
              <span>Next question in <strong>{countdown}s</strong></span>
            </div>
          )}

          {/* Navigation */}
          <div className="question-navigation">
            <button 
              onClick={handleNext} 
              disabled={!canProceed}
              className="next-btn"
            >
              {current === totalQuestions - 1 ? (
                <>Finish Hunt 🏁</>
              ) : (
                <>Next Stage →</>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="game-sidebar">
          <div className="treasure-map">
            <h3 className="sidebar-title">🗺️ Your Journey</h3>
            <div className="map-list">
              {Array.from({ length: current + 1 }).map((_, idx) => (
                <div
                  key={idx}
                  className={`map-item ${
                    idx === current ? "active" : ""
                  } ${answeredCorrectly[idx] ? "completed" : ""}`}
                >
                  <span className="map-number">{idx + 1}</span>
                  <span className="map-code">
                    {idx === current 
                      ? (currentQuestion?.code || `Stage ${idx + 1}`)
                      : `Stage ${idx + 1}`
                    }
                  </span>
                  {answeredCorrectly[idx] && <span className="checkmark">✓</span>}
                </div>
              ))}
              
              {Array.from({ length: totalQuestions - current - 1 }).map((_, idx) => (
                <div
                  key={`locked-${idx}`}
                  className="map-item locked"
                >
                  <span className="map-number locked-icon">🔒</span>
                  <span className="map-code">Locked</span>
                </div>
              ))}
            </div>
            
            <div className="progress-summary">
              <div className="summary-stat">
                <span className="summary-label">Completed</span>
                <span className="summary-value">{Object.keys(answeredCorrectly).length}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-label">Remaining</span>
                <span className="summary-value">{totalQuestions - current}</span>
              </div>
            </div>
          </div>

          <div className="live-leaderboard">
            <h3 className="sidebar-title">🏆 Top Hunters</h3>
            <div className="leaderboard-mini">
              {Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((p, i) => (
                  <div key={i} className="mini-row">
                    <span className="mini-rank">#{i + 1}</span>
                    <span className="mini-name">{p.playerName}</span>
                    <span className="mini-time">{formatTime(p.timeTakenSec)}</span>
                  </div>
                ))
              ) : (
                <p className="no-data">No records yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
