import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bird } from './Bird';
import { Pipe } from './Pipe';
import { Leaderboard } from './Leaderboard';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

// Logo URL - Replace with your hosted logo URL
const LOGO_URL = 'https://adventurebuildrstorage.storage.googleapis.com/wp-content/uploads/2024/10/11185818/AdventureBuildr-Logo-e1731351627826.png';

// Game physics constants - Adjust these to change game difficulty
// Higher GRAVITY = faster falling, More negative JUMP_FORCE = higher jumps
const GRAVITY = 0.6;
const JUMP_FORCE = -9;

// Pipe generation settings
// Higher PIPE_SPEED = faster moving pipes
// Lower PIPE_SPAWN_RATE = more frequent pipes
// Higher GAP_SIZE = more space between pipes
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1500;
const GAP_SIZE = 250;

// Local storage key for persisting high score
const HIGH_SCORE_KEY = 'flappyBirdHighScore';

type HighScore = Database['public']['Tables']['high_scores']['Row'];

// Sound effects URLs - Using short, lightweight MP3s
const SOUNDS = {
  jump: 'https://mbgoekwzincaggzfkxft.supabase.co/storage/v1/object/public/Sound%20Effects%20Library/flap-101soundboards.mp3',
  score: 'https://mbgoekwzincaggzfkxft.supabase.co/storage/v1/object/public/Sound%20Effects%20Library/point-101soundboards.mp3',
  gameOver: 'https://mbgoekwzincaggzfkxft.supabase.co/storage/v1/object/public/Sound%20Effects%20Library/die-101soundboards.mp3'
};

// Type definition for pipe objects
interface PipeData {
  id: number;
  x: number;
  height: number;
}

export function Game() {
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [username, setUsername] = useState('');
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  
  // Bird state
  const [birdPosition, setBirdPosition] = useState(300);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [birdRotation, setBirdRotation] = useState(0);
  
  // Obstacles and scoring
  const [pipes, setPipes] = useState<PipeData[]>([]);
  const [score, setScore] = useState(0);
  
  // Load high score from localStorage on initial render
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Game loop references
  const gameLoopRef = useRef<number>();
  const lastPipeRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  
  // Audio elements refs
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const scoreSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

  // Load high scores
  useEffect(() => {
    async function loadHighScores() {
      const { data } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(3);
      
      setHighScores(data || []);
      setIsLoadingScores(false);
    }

    loadHighScores();
  }, []);

  // Save high score
  const saveHighScore = useCallback(async (score: number) => {
    if (!username) return;
    
    const { data: scores } = await supabase
      .from('high_scores')
      .select('score')
      .order('score', { ascending: false });

    if (!scores) {
      console.error('Failed to fetch scores');
      return;
    }

    // If we have 3 scores, check if the new score is higher than any existing score
    if (scores.length >= 3 && score <= Math.min(...scores.map(s => s.score))) {
      alert('Sorry, your score isn\'t high enough for the leaderboard!');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: `${Date.now()}@temp.com`,
        password: 'temporary-password',
      });

      if (error) throw error;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Delete the lowest score if we already have 3 scores
      if (scores.length >= 3) {
        const lowestScore = Math.min(...scores.map(s => s.score));
        await supabase.from('high_scores')
          .delete()
          .eq('score', lowestScore);
      }

      await supabase.from('high_scores').insert({
        user_id: user.user.id,
        score,
        username,
      });

      setScoreSubmitted(true);

      // Reload high scores
      const { data: newScores } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(3);

      setHighScores(newScores || []);
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  }, [username, scoreSubmitted]);

  // Initialize audio elements
  useEffect(() => {
    jumpSoundRef.current = new Audio(SOUNDS.jump);
    scoreSoundRef.current = new Audio(SOUNDS.score);
    gameOverSoundRef.current = new Audio(SOUNDS.gameOver);
  }, []);

  // Play sound utility function
  const playSound = useCallback((sound: HTMLAudioElement | null) => {
    if (soundEnabled && sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [soundEnabled]);

  // Reset all game state to initial values
  const resetGame = useCallback(() => {
    setBirdPosition(300);
    setBirdVelocity(0);
    setBirdRotation(0);
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setScoreSubmitted(false);
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  }, []);

  // Handle bird jump action
  const jump = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
    }
    if (!gameOver) {
      playSound(jumpSoundRef.current);
      setBirdVelocity(JUMP_FORCE);
      setBirdRotation(-30);
    }
  }, [gameOver, gameStarted, playSound]);

  // Generate new pipe with random height
  const spawnPipe = useCallback(() => {
    // Ensure minimum pipe height and maintain gap size
    const minHeight = 50;
    const maxHeight = window.innerHeight - GAP_SIZE - minHeight;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    setPipes((pipes) => [
      ...pipes,
      {
        id: Date.now(),
        x: window.innerWidth,
        height,
        showLogo: pipes.length > 0 && (pipes.length + 1) % 7 === 0
      },
    ]);
  }, []);

  // Detect collisions between bird and pipes
  const checkCollision = useCallback(
    (birdPos: number, pipes: PipeData[]) => {
      // Define bird hitbox (96px from left edge, 48x48px size)
      const birdRect = {
        left: 96,
        right: 144,
        top: birdPos,
        bottom: birdPos + 48,
      };

      return pipes.some((pipe) => {
        const topPipeRect = {
          left: pipe.x,
          right: pipe.x + 80,
          top: 0,
          bottom: pipe.height,
        };

        const bottomPipeRect = {
          left: pipe.x,
          right: pipe.x + 80,
          top: pipe.height + GAP_SIZE,
          bottom: window.innerHeight,
        };

        return (
          (birdRect.right > topPipeRect.left &&
            birdRect.left < topPipeRect.right &&
            birdRect.top < topPipeRect.bottom) ||
          (birdRect.right > bottomPipeRect.left &&
            birdRect.left < bottomPipeRect.right &&
            birdRect.bottom > bottomPipeRect.top)
        );
      });
    },
    []
  );

  // Main game loop - handles all game updates
  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver) return;

    // Track frame count for initial pipe spawn delay
    frameCountRef.current += 1;

    // Update bird position and check boundaries
    setBirdPosition((pos) => {
      const newPos = pos + birdVelocity;
      // Game over if bird hits top or bottom of screen
      if (newPos < 0 || newPos > window.innerHeight - 48) {
        setGameOver(true);
        return pos;
      }
      return newPos;
    });

    // Apply gravity and update bird rotation
    setBirdVelocity((vel) => vel + GRAVITY);
    setBirdRotation((rot) => Math.min(rot + 3, 90));

    // Move pipes left and remove off-screen pipes
    setPipes((pipes) => {
      const newPipes = pipes
        .map((pipe) => ({
          ...pipe,
          x: pipe.x - PIPE_SPEED,
        }))
        .filter((pipe) => pipe.x > -100);

      // Increment score when bird passes a pipe
      newPipes.forEach((pipe) => {
        if (pipe.x + PIPE_SPEED >= 96 && pipe.x < 96) {
          setScore((s) => {
            const newScore = s + 1;
            playSound(scoreSoundRef.current);
            // Update and persist high score if needed
            setHighScore((hs) => {
              const updatedHighScore = Math.max(hs, newScore);
              localStorage.setItem(HIGH_SCORE_KEY, updatedHighScore.toString());
              return updatedHighScore;
            });
            return newScore;
          });
        }
      });

      return newPipes;
    });

    // Spawn new pipes after initial delay and at regular intervals
    if (
      Date.now() - lastPipeRef.current > PIPE_SPAWN_RATE &&
      frameCountRef.current > 60
    ) {
      spawnPipe();
      lastPipeRef.current = Date.now();
    }

    // End game if bird collides with any pipe
    if (checkCollision(birdPosition, pipes)) {
      setGameOver(true);
      playSound(gameOverSoundRef.current);
      return;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    gameStarted,
    gameOver,
    birdPosition,
    pipes,
    spawnPipe,
    checkCollision,
    birdVelocity,
  ]);

  // Handle spacebar controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  // Start/stop game loop based on game state
  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameStarted, gameOver]);

  // Game UI rendering
  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-blue-300 to-blue-500 cursor-pointer"
      onClick={jump}
    >
      {/* Sound toggle button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setSoundEnabled(!soundEnabled);
        }}
        className="absolute top-8 right-8 z-10 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
      >
        {soundEnabled ? (
          <Volume2 className="w-6 h-6 text-white" />
        ) : (
          <VolumeX className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Ground - green strip at bottom of screen */}
      <div className="absolute bottom-0 w-full h-24 bg-green-800" />

      {/* Bird and pipe elements */}
      <Bird position={birdPosition} rotation={birdRotation} />
      {pipes.map((pipe) => (
        <React.Fragment key={pipe.id}> 
          <Pipe position={pipe.x} height={pipe.height} isTop={true} />
          <Pipe
            position={pipe.x}
            height={window.innerHeight - pipe.height - GAP_SIZE}
            isTop={false}
          />
        </React.Fragment>
      ))}

      {/* Score display */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-4xl font-bold text-white drop-shadow-lg">
        {score}
      </div>

      {/* Start screen with logo and instructions */}
      {!gameStarted && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-6 animate-float">
            <img
              src={LOGO_URL}
              alt="Game Logo"
              className="w-full max-w-[500px] h-auto object-contain drop-shadow-xl"
            />
            <h1 className="text-6xl font-extrabold text-white drop-shadow-xl tracking-widest text-center">
              Flappy Bird
            </h1>
          </div>
          <p className="text-white text-lg mt-2">Click or press Space to start</p>
        </div>
      )}

      {/* Game over screen with score and restart button */}
      {gameOver && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-white p-8 rounded-lg shadow-lg">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
          <p className="text-lg mb-2">Score: {score}</p>
          <p className="text-lg mb-4">High Score: {highScore}</p>
          {score > 0 && !scoreSubmitted && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter your name"
                className="w-full px-4 py-2 border rounded-lg mb-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors w-full mb-4"
                onClick={(e) => {
                  e.stopPropagation();
                  saveHighScore(score);
                }}
                disabled={!username}
              >
                Save Score
              </button>
            </div>
          )}
          <button
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              resetGame();
            }}
          >
            Play Again
          </button>
        </div>
      )}
      
      {/* Leaderboard */}
      {!gameStarted && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
          <Leaderboard scores={highScores} isLoading={isLoadingScores} />
        </div>
      )}
    </div>
  );
}