
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GAME_WIDTH, GAME_HEIGHT, PITCH_MARGIN, GOAL_SIZE, GOAL_DEPTH,
  BALL_RADIUS, PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_SPEED,
  BALL_FRICTION, PLAYER_FRICTION, BOUNCE, KICK_FORCE, ALL_TEAMS,
  SLIDE_IMPULSE, SLIDE_DURATION, SLIDE_COOLDOWN, SLIDE_RECOVERY, RECOVERY_SPEED_FACTOR
} from '../constants';
import { PhysicsObject, Vector2, PowerUpType, PowerUpItem, ActivePowerUp, Difficulty, WeatherType, SkillTreeState } from '../types';

interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  color: string;
  size: number;
  type: 'square' | 'circle' | 'diamond';
  rotation: number;
  rotVel: number;
}

interface WeatherParticle {
  x: number;
  y: number;
  speed: number;
  length?: number; // for rain
  size?: number; // for snow
  angle?: number;
}

interface GameCanvasProps {
  homeTeamId: string;
  awayTeamId: string;
  playerTeamId: string;
  duration: number; // 0 means Unlimited
  targetScore: number | null;
  isMultiplayer?: boolean;
  isGoalieMode?: boolean;
  isFireMode?: boolean;
  difficulty: Difficulty;
  weather?: WeatherType;
  onComplete: (homeScore: number, awayScore: number) => void;
  T: any;
  skillTree?: SkillTreeState;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ homeTeamId, awayTeamId, playerTeamId, duration, targetScore, isMultiplayer = false, isGoalieMode = false, isFireMode = false, difficulty, weather = WeatherType.SUNNY, onComplete, T, skillTree }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [timeLeft, setTimeLeft] = useState(duration);
  const [gameState, setGameState] = useState<'KICKOFF' | 'PLAYING' | 'GOAL' | 'OVER'>('KICKOFF');
  const [goalAnimPhase, setGoalAnimPhase] = useState(0);
  
  // PowerUp states
  const powerUpsOnField = useRef<PowerUpItem[]>([]);
  const [p1Active, setP1Active] = useState<ActivePowerUp[]>([]);
  const [p2Active, setP2Active] = useState<ActivePowerUp[]>([]);
  
  const completionCalled = useRef(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const particles = useRef<Particle[]>([]);
  const weatherParticles = useRef<WeatherParticle[]>([]);

  const homeTeam = ALL_TEAMS.find(t => t.id === homeTeamId)!;
  const awayTeam = ALL_TEAMS.find(t => t.id === awayTeamId)!;
  const isPlayerHome = homeTeamId === playerTeamId;

  const goalTop = (GAME_HEIGHT - GOAL_SIZE) / 2;
  const goalBottom = (GAME_HEIGHT + GOAL_SIZE) / 2;

  // Weather Modifiers
  const weatherSpeedMult = weather === WeatherType.RAIN ? 0.85 : (weather === WeatherType.SNOW ? 1.2 : 1.0);
  const ballFriction = weather === WeatherType.RAIN ? 0.975 : (weather === WeatherType.SNOW ? 0.992 : BALL_FRICTION);
  const playerFriction = weather === WeatherType.RAIN ? 0.91 : (weather === WeatherType.SNOW ? 0.96 : PLAYER_FRICTION); // Normal is 0.93

  // Skill Tree Modifiers Calculation
  const getSpeedMod = (level: number) => {
    if (level <= 0) return 1.0;
    if (level === 1) return 1.02;
    if (level === 2) return 1.04;
    if (level === 3) return 1.07;
    if (level === 4) return 1.11;
    return 1.16;
  };

  const getShootMod = (level: number) => {
    if (level <= 0) return 1.0;
    if (level === 1) return 1.02;
    if (level === 2) return 1.04;
    if (level === 3) return 1.07;
    if (level === 4) return 1.11;
    return 1.16;
  };

  const getControlRestitution = (base: number, level: number) => {
    let mod = 1.0;
    if (level === 1) mod = 0.98;
    else if (level === 2) mod = 0.96;
    else if (level === 3) mod = 0.93;
    else if (level === 4) mod = 0.89;
    else if (level === 5) mod = 0.84;
    return base * mod;
  };

  const getSlideDistMod = (level: number) => {
    let bonus = 0;
    if (level >= 1) bonus += 0.05;
    if (level >= 3) bonus += 0.05;
    if (level >= 5) bonus += 0.05;
    return 1.0 + bonus;
  };

  const getSlideRecoveryMod = (level: number) => {
    let reduction = 0;
    if (level >= 2) reduction += 0.05;
    if (level >= 4) reduction += 0.10;
    return 1.0 - reduction;
  };

  // Apply modifiers only if skillTree is present
  const playerSpeedMod = skillTree ? getSpeedMod(skillTree.levels.speed) : 1.0;
  const playerShootMod = skillTree ? getShootMod(skillTree.levels.shoot) : 1.0;
  const playerRestitution = skillTree ? getControlRestitution(0.4, skillTree.levels.control) : 0.4;
  const slideImpulseMod = skillTree ? getSlideDistMod(skillTree.levels.defense) : 1.0;
  const slideRecoveryMod = skillTree ? getSlideRecoveryMod(skillTree.levels.defense) : 1.0;

  const ball = useRef<PhysicsObject>({
    pos: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: BALL_RADIUS, mass: 1, restitution: 0.8, friction: ballFriction
  });

  const leftPlayer = useRef<PhysicsObject>({
    pos: { x: GAME_WIDTH / 4, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: PLAYER_RADIUS, mass: 1.5, restitution: 0.4, friction: playerFriction,
    slideTimer: 0, slideCooldown: 0, recoveryTimer: 0
  });

  const rightPlayer = useRef<PhysicsObject>({
    pos: { x: (GAME_WIDTH * 3) / 4, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: PLAYER_RADIUS, mass: 1.5, restitution: 0.4, friction: playerFriction,
    slideTimer: 0, slideCooldown: 0, recoveryTimer: 0
  });

  // Apply Skill Tree Modifiers to the controlled player instance
  useEffect(() => {
    if (skillTree) {
        if (isPlayerHome) {
            leftPlayer.current.restitution = playerRestitution;
        } else {
            rightPlayer.current.restitution = playerRestitution;
        }
    }
  }, [skillTree, isPlayerHome, playerRestitution]);

  const goalieSpeed = 3.0 * weatherSpeedMult;
  const leftGoalie = useRef<PhysicsObject>({
    pos: { x: PITCH_MARGIN + 30, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: goalieSpeed }, 
    radius: PLAYER_RADIUS, mass: 50, restitution: 0.5, friction: 1.0 
  });

  const rightGoalie = useRef<PhysicsObject>({
    pos: { x: GAME_WIDTH - PITCH_MARGIN - 30, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: -goalieSpeed }, 
    radius: PLAYER_RADIUS, mass: 50, restitution: 0.5, friction: 1.0
  });

  const posts = [
    { x: PITCH_MARGIN, y: goalTop, radius: 8 },
    { x: PITCH_MARGIN, y: goalBottom, radius: 8 },
    { x: GAME_WIDTH - PITCH_MARGIN, y: goalTop, radius: 8 },
    { x: GAME_WIDTH - PITCH_MARGIN, y: goalBottom, radius: 8 },
  ];

  const keys = useRef<{ [key: string]: boolean }>({});
  const lastKeys = useRef<{ [key: string]: boolean }>({});

  const playSound = useCallback((type: 'kick' | 'goal' | 'wall' | 'whistle') => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'kick':
        osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); osc.start(); osc.stop(now + 0.1); break;
      case 'goal':
        osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(500, now + 0.8);
        gain.gain.setValueAtTime(0.3, now); osc.start(); osc.stop(now + 0.8); break;
      case 'whistle':
        osc.frequency.setValueAtTime(1000, now); osc.frequency.exponentialRampToValueAtTime(1500, now + 0.3);
        gain.gain.setValueAtTime(0.05, now); osc.start(); osc.stop(now + 0.3); break;
      case 'wall':
        osc.frequency.setValueAtTime(60, now);
        gain.gain.setValueAtTime(0.1, now); osc.start(); osc.stop(now + 0.05); break;
    }
  }, []);

  const createExplosion = (x: number, y: number, color1: string, color2: string) => {
    const types: ('square' | 'circle' | 'diamond')[] = ['square', 'circle', 'diamond'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 10;
      particles.current.push({
        pos: { x, y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        life: 1.0,
        color: Math.random() > 0.5 ? color1 : color2,
        size: 4 + Math.random() * 8,
        type: types[Math.floor(Math.random() * types.length)],
        rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 0.3
      });
    }
  };

  const resetPositions = useCallback(() => {
    ball.current.pos = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }; ball.current.vel = { x: 0, y: 0 };
    leftPlayer.current.pos = { x: GAME_WIDTH / 4, y: GAME_HEIGHT / 2 }; leftPlayer.current.vel = { x: 0, y: 0 };
    rightPlayer.current.pos = { x: (GAME_WIDTH * 3) / 4, y: GAME_HEIGHT / 2 }; rightPlayer.current.vel = { x: 0, y: 0 };
    // Reset timers
    leftPlayer.current.slideTimer = 0; leftPlayer.current.slideCooldown = 0; leftPlayer.current.recoveryTimer = 0;
    rightPlayer.current.slideTimer = 0; rightPlayer.current.slideCooldown = 0; rightPlayer.current.recoveryTimer = 0;
    
    setGameState('KICKOFF');
    setGoalAnimPhase(0);
    setTimeout(() => { if(gameState !== 'OVER') setGameState('PLAYING'); }, 1500);
  }, [gameState]);

  // Init Weather Particles
  useEffect(() => {
    if (weather === WeatherType.RAIN) {
      weatherParticles.current = Array.from({ length: 150 }, () => ({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 15 + Math.random() * 10,
        length: 10 + Math.random() * 10
      }));
    } else if (weather === WeatherType.SNOW) {
      weatherParticles.current = Array.from({ length: 100 }, () => ({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: 1 + Math.random() * 2,
        size: 2 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2
      }));
    } else {
      weatherParticles.current = [];
    }
  }, [weather]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    playSound('whistle');
    const timer = setTimeout(() => { setGameState('PLAYING'); }, 1500);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); clearTimeout(timer); };
  }, [playSound]);

  useEffect(() => {
    let timerInterval: any;
    let powerUpInterval: any;
    let decayInterval: any;

    if (gameState === 'PLAYING') {
      if (duration > 0) {
        timerInterval = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) { setGameState('OVER'); playSound('whistle'); return 0; }
            return prev - 1;
          });
        }, 1000);
      }

      if (isFireMode) {
        powerUpInterval = setInterval(() => {
          if (powerUpsOnField.current.length < 2) {
            const types = [PowerUpType.SPEED, PowerUpType.KICK, PowerUpType.SIZE];
            const type = types[Math.floor(Math.random() * types.length)];
            const margin = PITCH_MARGIN + 100;
            powerUpsOnField.current.push({
              id: Math.random().toString(),
              type,
              pos: { 
                x: margin + Math.random() * (GAME_WIDTH - 2 * margin),
                y: margin + Math.random() * (GAME_HEIGHT - 2 * margin)
              },
              radius: 20
            });
          }
        }, 8000);
      }

      decayInterval = setInterval(() => {
        setP1Active(prev => prev.map(p => ({ ...p, duration: p.duration - 1 })).filter(p => p.duration > 0));
        setP2Active(prev => prev.map(p => ({ ...p, duration: p.duration - 1 })).filter(p => p.duration > 0));
      }, 1000);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(powerUpInterval);
      clearInterval(decayInterval);
    };
  }, [gameState, duration, isFireMode, playSound]);

  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const update = (dt: number) => {
      // Update Particles
      particles.current.forEach(p => {
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        p.vel.x *= 0.97;
        p.vel.y *= 0.97;
        p.life -= 0.012;
        p.rotation += p.rotVel;
      });
      particles.current = particles.current.filter(p => p.life > 0);

      // Update Weather Particles
      if (weather === WeatherType.RAIN) {
        weatherParticles.current.forEach(p => {
          p.y += p.speed;
          p.x -= 1; // slight wind
          if (p.y > GAME_HEIGHT) { p.y = -20; p.x = Math.random() * GAME_WIDTH; }
          if (p.x < 0) p.x = GAME_WIDTH;
        });
      } else if (weather === WeatherType.SNOW) {
        weatherParticles.current.forEach(p => {
          p.y += p.speed;
          p.angle! += 0.05;
          p.x += Math.sin(p.angle!);
          if (p.y > GAME_HEIGHT) { p.y = -10; p.x = Math.random() * GAME_WIDTH; }
        });
      }

      // Update Slide Timers
      [leftPlayer.current, rightPlayer.current].forEach(p => {
        if (p.slideTimer && p.slideTimer > 0) p.slideTimer--;
        if (p.slideCooldown && p.slideCooldown > 0) p.slideCooldown--;
        if (p.recoveryTimer && p.recoveryTimer > 0) p.recoveryTimer--;
        
        // When sliding, reduce friction significantly to glide
        if (p.slideTimer && p.slideTimer > 0) {
            p.friction = 0.99; // very slippery
        } else {
            p.friction = playerFriction; // restore normal
        }
      });

      if (gameState === 'GOAL') {
        setGoalAnimPhase(prev => Math.min(prev + 0.015, 1));
      }

      if (gameState === 'OVER') {
        if (!completionCalled.current) { completionCalled.current = true; onComplete(score.home, score.away); }
        return;
      }

      if (targetScore !== null) {
        if (score.home >= targetScore || score.away >= targetScore) {
          setGameState('OVER');
          playSound('whistle');
          return;
        }
      }

      const p1Kick = keys.current['Space'] && !lastKeys.current['Space'];
      const p2Kick = keys.current['Enter'] && !lastKeys.current['Enter'];
      
      lastKeys.current = { ...keys.current };

      if (isGoalieMode) {
        [leftGoalie.current, rightGoalie.current].forEach((g, idx) => {
          g.pos.x = idx === 0 ? PITCH_MARGIN + 30 : GAME_WIDTH - PITCH_MARGIN - 30;
          g.vel.x = 0;
          g.pos.y += g.vel.y;
          if (g.pos.y - g.radius < goalTop) {
            g.pos.y = goalTop + g.radius;
            g.vel.y = goalieSpeed; 
          } else if (g.pos.y + g.radius > goalBottom) {
            g.pos.y = goalBottom - g.radius;
            g.vel.y = -goalieSpeed;
          }
        });
      }

      if (gameState !== 'PLAYING') return;

      // Handle PowerUp collection
      if (isFireMode) {
        powerUpsOnField.current.forEach((pu, idx) => {
          [leftPlayer.current, rightPlayer.current].forEach((p, pIdx) => {
            const dx = p.pos.x - pu.pos.x;
            const dy = p.pos.y - pu.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < p.radius + pu.radius) {
              if (pIdx === 0) setP1Active(prev => [...prev.filter(a => a.type !== pu.type), { type: pu.type, duration: 10 }]);
              else setP2Active(prev => [...prev.filter(a => a.type !== pu.type), { type: pu.type, duration: 10 }]);
              powerUpsOnField.current.splice(idx, 1);
              createExplosion(pu.pos.x, pu.pos.y, '#ffffff', '#fbbf24');
            }
          });
        });
      }

      // Modifier Calculations
      const p1HasSpeed = p1Active.some(p => p.type === PowerUpType.SPEED);
      const p1HasKick = p1Active.some(p => p.type === PowerUpType.KICK);
      const p1HasSize = p1Active.some(p => p.type === PowerUpType.SIZE);
      const p1SpeedMult = p1HasSpeed ? 1.5 : 1.0;
      const p1KickMult = p1HasKick ? 1.8 : 1.0;
      leftPlayer.current.radius = PLAYER_RADIUS * (p1HasSize ? 1.2 : 1.0);

      const p2HasSpeed = p2Active.some(p => p.type === PowerUpType.SPEED);
      const p2HasKick = p2Active.some(p => p.type === PowerUpType.KICK);
      const p2HasSize = p2Active.some(p => p.type === PowerUpType.SIZE);
      const p2SpeedMult = p2HasSpeed ? 1.5 : 1.0;
      const p2KickMult = p2HasKick ? 1.8 : 1.0;
      rightPlayer.current.radius = PLAYER_RADIUS * (p2HasSize ? 1.2 : 1.0);

      // --- WASD Control Logic (P1 or Single Player) ---
      let wasdPlayer = leftPlayer.current; // Default to Left (Home)
      
      // Determine effective skills based on player side (if career mode)
      const isCareerP1 = !isMultiplayer && isPlayerHome; // Single player controlling P1 (Home)
      const isCareerP2 = !isMultiplayer && !isPlayerHome; // Single player controlling P2 (Away)

      let wasdSpeedMod = 1.0;
      let wasdShootMod = 1.0;
      let wasdSlideDistMod = 1.0;
      let wasdSlideRecoveryMod = 1.0;

      if (isCareerP1) {
          wasdSpeedMod = playerSpeedMod;
          wasdShootMod = playerShootMod;
          wasdSlideDistMod = slideImpulseMod;
          wasdSlideRecoveryMod = slideRecoveryMod;
      }

      let wasdSpeedMult = p1SpeedMult;
      let wasdKickMult = p1KickMult;

      // In single player, if the user is Away, they control the Right player
      if (isCareerP2) {
          wasdPlayer = rightPlayer.current;
          wasdSpeedMult = p2SpeedMult;
          wasdKickMult = p2KickMult;
          // Apply mods to WASD if user is controlling right player
          wasdSpeedMod = playerSpeedMod;
          wasdShootMod = playerShootMod;
          wasdSlideDistMod = slideImpulseMod;
          wasdSlideRecoveryMod = slideRecoveryMod;
      }

      const p1Move = { x: 0, y: 0 };
      if (keys.current['KeyW']) p1Move.y -= 1;
      if (keys.current['KeyS']) p1Move.y += 1;
      if (keys.current['KeyA']) p1Move.x -= 1;
      if (keys.current['KeyD']) p1Move.x += 1;
      
      const p1Slow = !!keys.current['ShiftLeft'];

      // Logic for P1 Kick vs Slide
      if (p1Kick) {
        const dx = ball.current.pos.x - wasdPlayer.pos.x;
        const dy = ball.current.pos.y - wasdPlayer.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const kickRange = wasdPlayer.radius + ball.current.radius + 12;

        if (dist < kickRange) {
          // SHOOT
          ball.current.vel.x = (dx / dist) * KICK_FORCE * wasdKickMult * wasdShootMod * 2.5; 
          ball.current.vel.y = (dy / dist) * KICK_FORCE * wasdKickMult * wasdShootMod * 2.5;
          playSound('kick');
        } else if ((!wasdPlayer.slideCooldown || wasdPlayer.slideCooldown <= 0) && (!wasdPlayer.slideTimer || wasdPlayer.slideTimer <= 0)) {
          // SLIDE TACKLE
          let slideDirX = 0;
          let slideDirY = 0;
          
          // Use input direction if available, else current velocity, else X-axis default
          if (p1Move.x !== 0 || p1Move.y !== 0) {
            const mag = Math.sqrt(p1Move.x**2 + p1Move.y**2);
            slideDirX = p1Move.x / mag;
            slideDirY = p1Move.y / mag;
          } else {
             const velMag = Math.sqrt(wasdPlayer.vel.x**2 + wasdPlayer.vel.y**2);
             if (velMag > 0.1) {
               slideDirX = wasdPlayer.vel.x / velMag;
               slideDirY = wasdPlayer.vel.y / velMag;
             } else {
               // Default based on team side? Left player slides right, Right player slides left
               slideDirX = wasdPlayer === leftPlayer.current ? 1 : -1;
             }
          }

          wasdPlayer.vel.x = slideDirX * SLIDE_IMPULSE * wasdSlideDistMod;
          wasdPlayer.vel.y = slideDirY * SLIDE_IMPULSE * wasdSlideDistMod;
          wasdPlayer.slideTimer = SLIDE_DURATION;
          wasdPlayer.slideCooldown = SLIDE_COOLDOWN;
          wasdPlayer.recoveryTimer = SLIDE_RECOVERY * wasdSlideRecoveryMod;
          playSound('kick'); // Swish sound (reused)
        }
      }

      // Apply Movement P1 (Only if not sliding)
      if (!wasdPlayer.slideTimer || wasdPlayer.slideTimer <= 0) {
        if (p1Move.x !== 0 || p1Move.y !== 0) {
          const mag = Math.sqrt(p1Move.x**2 + p1Move.y**2);
          const speedMultiplier = p1Slow ? 0.35 : 1.0;
          // Check for recovery penalty
          const recoveryFactor = (wasdPlayer.recoveryTimer && wasdPlayer.recoveryTimer > 0) ? RECOVERY_SPEED_FACTOR : 1.0;
          
          const finalSpeed = PLAYER_SPEED * speedMultiplier * wasdSpeedMult * wasdSpeedMod * weatherSpeedMult * recoveryFactor;
          wasdPlayer.vel.x += (p1Move.x / mag) * finalSpeed;
          wasdPlayer.vel.y += (p1Move.y / mag) * finalSpeed;
        }
      }

      if (isMultiplayer) {
        // --- P2 Control Logic (Arrows) - Always Right Player in Multiplayer ---
        const p2Move = { x: 0, y: 0 };
        if (keys.current['ArrowUp']) p2Move.y -= 1;
        if (keys.current['ArrowDown']) p2Move.y += 1;
        if (keys.current['ArrowLeft']) p2Move.x -= 1;
        if (keys.current['ArrowRight']) p2Move.x += 1;

        const p2Slow = !!keys.current['ControlRight'] || !!keys.current['AltRight'];

        // Logic for P2 Kick vs Slide
        if (p2Kick) {
          const dx = ball.current.pos.x - rightPlayer.current.pos.x;
          const dy = ball.current.pos.y - rightPlayer.current.pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const kickRange = rightPlayer.current.radius + ball.current.radius + 12;

          if (dist < kickRange) {
            // SHOOT
            ball.current.vel.x = (dx / dist) * KICK_FORCE * p2KickMult * 2.5; 
            ball.current.vel.y = (dy / dist) * KICK_FORCE * p2KickMult * 2.5;
            playSound('kick');
          } else if ((!rightPlayer.current.slideCooldown || rightPlayer.current.slideCooldown <= 0) && (!rightPlayer.current.slideTimer || rightPlayer.current.slideTimer <= 0)) {
             // SLIDE TACKLE
             let slideDirX = 0;
             let slideDirY = 0;
             
             if (p2Move.x !== 0 || p2Move.y !== 0) {
               const mag = Math.sqrt(p2Move.x**2 + p2Move.y**2);
               slideDirX = p2Move.x / mag;
               slideDirY = p2Move.y / mag;
             } else {
                const velMag = Math.sqrt(rightPlayer.current.vel.x**2 + rightPlayer.current.vel.y**2);
                if (velMag > 0.1) {
                  slideDirX = rightPlayer.current.vel.x / velMag;
                  slideDirY = rightPlayer.current.vel.y / velMag;
                } else {
                  slideDirX = -1; // Default left
                }
             }

             rightPlayer.current.vel.x = slideDirX * SLIDE_IMPULSE;
             rightPlayer.current.vel.y = slideDirY * SLIDE_IMPULSE;
             rightPlayer.current.slideTimer = SLIDE_DURATION;
             rightPlayer.current.slideCooldown = SLIDE_COOLDOWN;
             rightPlayer.current.recoveryTimer = SLIDE_RECOVERY;
             playSound('kick');
          }
        }

        // Apply Movement P2 (Only if not sliding)
        if (!rightPlayer.current.slideTimer || rightPlayer.current.slideTimer <= 0) {
          if (p2Move.x !== 0 || p2Move.y !== 0) {
            const mag = Math.sqrt(p2Move.x**2 + p2Move.y**2);
            const speedMultiplier = p2Slow ? 0.35 : 1.0;
            const recoveryFactor = (rightPlayer.current.recoveryTimer && rightPlayer.current.recoveryTimer > 0) ? RECOVERY_SPEED_FACTOR : 1.0;
            
            const finalSpeed = PLAYER_SPEED * speedMultiplier * p2SpeedMult * weatherSpeedMult * recoveryFactor;
            rightPlayer.current.vel.x += (p2Move.x / mag) * finalSpeed;
            rightPlayer.current.vel.y += (p2Move.y / mag) * finalSpeed;
          }
        }
      } else {
        // --- AI Logic (Controls the team NOT controlled by the user) ---
        // If User is Home (Left), AI is Away (Right)
        // If User is Away (Right), AI is Home (Left)
        const ai = isPlayerHome ? rightPlayer.current : leftPlayer.current;
        const aiTeam = isPlayerHome ? awayTeam : homeTeam;
        const aiModifier = (isPlayerHome ? p2SpeedMult : p1SpeedMult);
        
        // Base Speed influenced by team strength and difficulty
        const strengthFactor = 0.5 + aiTeam.strength / 200;
        const difficultyFactor = difficulty === Difficulty.EASY ? 0.8 : (difficulty === Difficulty.NORMAL ? 1.0 : 1.2);
        
        // Apply recovery factor to AI too
        const recoveryFactor = (ai.recoveryTimer && ai.recoveryTimer > 0) ? RECOVERY_SPEED_FACTOR : 1.0;
        const aiSpeed = PLAYER_SPEED * strengthFactor * aiModifier * difficultyFactor * weatherSpeedMult * recoveryFactor;
        
        // AI shouldn't move if sliding
        if (!ai.slideTimer || ai.slideTimer <= 0) {
            let targetX = ball.current.pos.x;
            let targetY = ball.current.pos.y;

            const oppGoalX = isPlayerHome ? PITCH_MARGIN : GAME_WIDTH - PITCH_MARGIN;
            const oppGoalY = GAME_HEIGHT / 2;

            if (difficulty !== Difficulty.EASY) {
              // OFFENSIVE ORIENTED AI
              const dxBallToGoal = oppGoalX - ball.current.pos.x;
              const dyBallToGoal = oppGoalY - ball.current.pos.y;
              const distBallToGoal = Math.sqrt(dxBallToGoal**2 + dyBallToGoal**2) || 1;
              
              const offensiveOffset = difficulty === Difficulty.HARD ? 40 : 60;
              const offensiveTargetX = ball.current.pos.x - (dxBallToGoal / distBallToGoal) * offensiveOffset;
              const offensiveTargetY = ball.current.pos.y - (dyBallToGoal / distBallToGoal) * offensiveOffset;
              
              if (difficulty === Difficulty.HARD) {
                targetX = offensiveTargetX;
                targetY = offensiveTargetY;
              } else {
                const bias = 0.6; 
                targetX = (ball.current.pos.x * (1 - bias)) + (offensiveTargetX * bias);
                targetY = (ball.current.pos.y * (1 - bias)) + (offensiveTargetY * bias);
                if (Date.now() % 3000 < 500) {
                  targetX = ball.current.pos.x;
                  targetY = ball.current.pos.y;
                }
              }
            }

            const isBallInCorner = (ball.current.pos.x < PITCH_MARGIN + 40 || ball.current.pos.x > GAME_WIDTH - PITCH_MARGIN - 40) &&
                                  (ball.current.pos.y < PITCH_MARGIN + 40 || ball.current.pos.y > GAME_HEIGHT - PITCH_MARGIN - 40);
            
            if (isBallInCorner && difficulty !== Difficulty.HARD) {
              const distToBall = Math.sqrt((targetX - ai.pos.x)**2 + (targetY - ai.pos.y)**2);
              if (distToBall < 50) {
                const centerDirX = GAME_WIDTH / 2 - ai.pos.x;
                const centerDirY = GAME_HEIGHT / 2 - ai.pos.y;
                const centerMag = Math.sqrt(centerDirX**2 + centerDirY**2) || 1;
                targetX = ai.pos.x + (centerDirX / centerMag) * 50;
                targetY = ai.pos.y + (centerDirY / centerMag) * 50;
              }
            }

            const adx = targetX - ai.pos.x;
            const ady = targetY - ai.pos.y;
            const adist = Math.sqrt(adx * adx + ady * ady) || 0.001;
            
            if (adist > 5) {
              ai.vel.x += (adx / adist) * aiSpeed;
              ai.vel.y += (ady / adist) * aiSpeed;
            }

            // AI Shoot Logic
            const realDistToBall = Math.sqrt((ball.current.pos.x - ai.pos.x)**2 + (ball.current.pos.y - ai.pos.y)**2);
            const kickDist = ai.radius + ball.current.radius + 10;
            
            if (realDistToBall < kickDist) {
              const kickProbability = difficulty === Difficulty.EASY ? 0.1 : (difficulty === Difficulty.NORMAL ? 0.25 : 0.5);
              if (Math.random() < kickProbability) {
                const bdx = ball.current.pos.x - ai.pos.x;
                const bdy = ball.current.pos.y - ai.pos.y;
                const bdist = Math.sqrt(bdx*bdx + bdy*bdy) || 1;
                
                const power = difficulty === Difficulty.HARD ? 4 : (difficulty === Difficulty.NORMAL ? 3 : 2);
                ball.current.vel.x += (bdx / bdist) * power;
                ball.current.vel.y += (bdy / bdist) * power;
                playSound('kick');
              }
            }
            // Simple AI Slide Logic (Only Hard mode)
            else if (difficulty === Difficulty.HARD && (!ai.slideCooldown || ai.slideCooldown <= 0) && realDistToBall > 60 && realDistToBall < 150) {
               // If ball is roughly in front and opponent is close to ball, maybe slide?
               // Simplified: random slide if near ball but can't kick
               if (Math.random() < 0.02) {
                   const bdx = ball.current.pos.x - ai.pos.x;
                   const bdy = ball.current.pos.y - ai.pos.y;
                   const bdist = Math.sqrt(bdx*bdx + bdy*bdy) || 1;
                   ai.vel.x = (bdx / bdist) * SLIDE_IMPULSE;
                   ai.vel.y = (bdy / bdist) * SLIDE_IMPULSE;
                   ai.slideTimer = SLIDE_DURATION;
                   ai.slideCooldown = SLIDE_COOLDOWN;
                   ai.recoveryTimer = SLIDE_RECOVERY;
                   playSound('kick');
               }
            }
        }
      }

      const physicsObjects = [leftPlayer.current, rightPlayer.current, ball.current];
      if (isGoalieMode) physicsObjects.push(leftGoalie.current, rightGoalie.current);

      physicsObjects.forEach(obj => {
        obj.pos.x += obj.vel.x;
        obj.pos.y += obj.vel.y;
        obj.vel.x *= obj.friction;
        obj.vel.y *= obj.friction;
        
        const speed = Math.sqrt(obj.vel.x**2 + obj.vel.y**2);
        
        // Special case for max speed: Sliding allows temporary overspeed
        let max = (obj === ball.current ? PLAYER_MAX_SPEED * 4 : PLAYER_MAX_SPEED);
        // If sliding, allow the high velocity impulse without clamping immediately
        if (obj.slideTimer && obj.slideTimer > 0) {
             max = SLIDE_IMPULSE * (obj === wasdPlayer ? slideImpulseMod : 1.0) + 2; 
        } else if (obj !== ball.current) {
             // Apply speed mod to player if moving normally
             if (obj === wasdPlayer) max *= wasdSpeedMod;
        }

        // Apply weather modifier to max speed limit
        const limitModifier = weatherSpeedMult; 
        max *= limitModifier;

        if (speed > max) {
          obj.vel.x = (obj.vel.x / speed) * max;
          obj.vel.y = (obj.vel.y / speed) * max;
        }
      });

      const checkCircleColl = (o1: PhysicsObject, o2: PhysicsObject) => {
        const dx = o1.pos.x - o2.pos.x;
        const dy = o1.pos.y - o2.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const minDist = o1.radius + o2.radius;
        if (dist < minDist) {
          const normalX = dx / dist;
          const normalY = dy / dist;
          const isPlayerPlayer = (o1 !== ball.current && o2 !== ball.current);
          const separationFactor = isPlayerPlayer ? 1.05 : 1.15;
          const overlap = (minDist - dist) * separationFactor;
          const totalMass = o1.mass + o2.mass;
          o1.pos.x += normalX * overlap * (o2.mass / totalMass);
          o1.pos.y += normalY * overlap * (o2.mass / totalMass);
          o2.pos.x -= normalX * overlap * (o1.mass / totalMass);
          o2.pos.y -= normalY * overlap * (o1.mass / totalMass);

          // Anti-pinch: If ball is involved, add slight tangential noise to prevent sticking
          // This creates a "slippery" effect when the ball is squeezed between players
          if (o1 === ball.current || o2 === ball.current) {
             const tangentX = -normalY;
             const tangentY = normalX;
             const nudge = 0.25; // Tiny nudge amount
             const sign = Math.random() > 0.5 ? 1 : -1;
             
             if (o1 === ball.current) {
               o1.pos.x += tangentX * nudge * sign;
               o1.pos.y += tangentY * nudge * sign;
             } else {
               o2.pos.x += tangentX * nudge * sign;
               o2.pos.y += tangentY * nudge * sign;
             }
          }

          const relativeVelX = o1.vel.x - o2.vel.x;
          const relativeVelY = o1.vel.y - o2.vel.y;
          const dot = relativeVelX * normalX + relativeVelY * normalY;
          if (dot < 0) {
            const isBallInvolved = (o1 === ball.current || o2 === ball.current);
            let forceFactor = isBallInvolved ? 2.0 : 1.0;
            // Increase force if one object is sliding
            if ((o1.slideTimer && o1.slideTimer > 0) || (o2.slideTimer && o2.slideTimer > 0)) {
                forceFactor = 2.5;
            }

            const impulse = (dot * forceFactor) / totalMass;
            o1.vel.x -= impulse * o2.mass * normalX;
            o1.vel.y -= impulse * o2.mass * normalY;
            o2.vel.x += impulse * o1.mass * normalX;
            o2.vel.y += impulse * o1.mass * normalY;
            if (isBallInvolved) playSound('kick');
          }
        }
      };

      for(let i=0; i<physicsObjects.length; i++) {
        for(let j=i+1; j<physicsObjects.length; j++) {
          checkCircleColl(physicsObjects[i], physicsObjects[j]);
        }
      }

      posts.forEach(post => {
        const dx = ball.current.pos.x - post.x;
        const dy = ball.current.pos.y - post.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const minDist = ball.current.radius + post.radius;
        if (dist < minDist) {
          const normalX = dx / dist;
          const normalY = dy / dist;
          ball.current.pos.x += normalX * (minDist - dist);
          ball.current.pos.y += normalY * (minDist - dist);
          const dot = ball.current.vel.x * normalX + ball.current.vel.y * normalY;
          if (dot < 0) {
            ball.current.vel.x -= 2 * dot * normalX;
            ball.current.vel.y -= 2 * dot * normalY;
            ball.current.vel.x *= 0.8; 
            ball.current.vel.y *= 0.8;
            playSound('wall');
          }
        }
      });

      physicsObjects.forEach(obj => {
        const inGoalY = obj.pos.y > goalTop && obj.pos.y < goalBottom;
        if (obj.pos.x - obj.radius < PITCH_MARGIN && !inGoalY) {
          obj.pos.x = PITCH_MARGIN + obj.radius;
          obj.vel.x *= -BOUNCE;
          playSound('wall');
        } else if (obj.pos.x + obj.radius > GAME_WIDTH - PITCH_MARGIN && !inGoalY) {
          obj.pos.x = GAME_WIDTH - PITCH_MARGIN - obj.radius;
          obj.vel.x *= -BOUNCE;
          playSound('wall');
        }
        if (obj.pos.y - obj.radius < PITCH_MARGIN) {
          obj.pos.y = PITCH_MARGIN + obj.radius;
          obj.vel.y *= -BOUNCE;
          playSound('wall');
        } else if (obj.pos.y + obj.radius > GAME_HEIGHT - PITCH_MARGIN) {
          obj.pos.y = GAME_HEIGHT - PITCH_MARGIN - obj.radius;
          obj.vel.y *= -BOUNCE;
          playSound('wall');
        }
        if (obj === ball.current) {
          if (obj.pos.x < PITCH_MARGIN && inGoalY) {
            setScore(p => ({ ...p, away: p.away + 1 })); 
            setGameState('GOAL'); 
            playSound('goal'); 
            createExplosion(obj.pos.x, obj.pos.y, awayTeam.color, awayTeam.secondaryColor);
            setTimeout(resetPositions, 2000);
          } else if (obj.pos.x > GAME_WIDTH - PITCH_MARGIN && inGoalY) {
            setScore(p => ({ ...p, home: p.home + 1 })); 
            setGameState('GOAL'); 
            playSound('goal'); 
            createExplosion(obj.pos.x, obj.pos.y, homeTeam.color, homeTeam.secondaryColor);
            setTimeout(resetPositions, 2000);
          }
        }
      });
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Pitch background
      const pitchGrad = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT/2, 100, GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH/1.2);
      pitchGrad.addColorStop(0, '#1e293b'); pitchGrad.addColorStop(1, '#020617');
      ctx.fillStyle = pitchGrad; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      const stripeW = 60;
      for (let x = PITCH_MARGIN; x < GAME_WIDTH - PITCH_MARGIN; x += stripeW) {
        ctx.fillStyle = ((x - PITCH_MARGIN) / stripeW) % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'rgba(2, 6, 23, 0.2)';
        ctx.fillRect(x, PITCH_MARGIN, stripeW, GAME_HEIGHT - PITCH_MARGIN * 2);
      }
      
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; ctx.lineWidth = 2;
      ctx.strokeRect(PITCH_MARGIN, PITCH_MARGIN, GAME_WIDTH - PITCH_MARGIN*2, GAME_HEIGHT - PITCH_MARGIN*2);
      ctx.beginPath(); ctx.moveTo(GAME_WIDTH/2, PITCH_MARGIN); ctx.lineTo(GAME_WIDTH/2, GAME_HEIGHT - PITCH_MARGIN); ctx.stroke();
      ctx.beginPath(); ctx.arc(GAME_WIDTH/2, GAME_HEIGHT/2, 80, 0, Math.PI*2); ctx.stroke();
      
      const drawGoal = (x: number, isLeft: boolean, teamColor: string) => {
        const dir = isLeft ? -1 : 1; const gT = goalTop;
        ctx.strokeStyle = teamColor; ctx.lineWidth = 4; ctx.shadowBlur = 15; ctx.shadowColor = teamColor;
        ctx.strokeRect(isLeft ? x - GOAL_DEPTH : x, gT, GOAL_DEPTH, GOAL_SIZE); ctx.shadowBlur = 0;
        posts.filter(p => isLeft ? p.x === PITCH_MARGIN : p.x === GAME_WIDTH - PITCH_MARGIN).forEach(post => {
          ctx.beginPath(); ctx.arc(post.x, post.y, post.radius, 0, Math.PI*2); ctx.fillStyle = '#f8fafc'; ctx.fill();
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
        });
      };
      drawGoal(PITCH_MARGIN, true, homeTeam.color);
      drawGoal(GAME_WIDTH - PITCH_MARGIN, false, awayTeam.color);

      // Draw PowerUps
      if (isFireMode) {
        powerUpsOnField.current.forEach(pu => {
          const glow = 10 + Math.sin(Date.now() / 200) * 10;
          ctx.save();
          ctx.shadowBlur = glow; ctx.shadowColor = '#fbbf24';
          ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(pu.pos.x, pu.pos.y, pu.radius, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = 'white'; ctx.font = '20px Inter'; ctx.textAlign = 'center';
          const icon = pu.type === PowerUpType.SPEED ? '⚡' : (pu.type === PowerUpType.KICK ? '👞' : '📏');
          ctx.fillText(icon, pu.pos.x, pu.pos.y + 7);
          ctx.restore();
        });
      }

      // Draw Particles
      particles.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.rotation);
        if (p.type === 'square') {
          ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        } else if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size/2);
          ctx.lineTo(p.size/2, 0);
          ctx.lineTo(0, p.size/2);
          ctx.lineTo(-p.size/2, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });
      ctx.globalAlpha = 1;

      // Draw Weather Effects
      if (weather === WeatherType.RAIN) {
        ctx.strokeStyle = 'rgba(174, 194, 224, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        weatherParticles.current.forEach(p => {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.length!);
        });
        ctx.stroke();
      } else if (weather === WeatherType.SNOW) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        weatherParticles.current.forEach(p => {
           ctx.moveTo(p.x, p.y);
           ctx.arc(p.x, p.y, p.size!, 0, Math.PI * 2);
        });
        ctx.fill();
      }

      const drawObj = (o: PhysicsObject, color: string, second: string, label?: string, isActive?: boolean, isGoalie?: boolean) => {
        const isSliding = o.slideTimer && o.slideTimer > 0;
        
        ctx.save();
        
        // Slide visual effect (Trail)
        if (isSliding) {
             const vMag = Math.sqrt(o.vel.x**2 + o.vel.y**2);
             if (vMag > 1) {
                const trailLen = 20;
                ctx.beginPath();
                ctx.moveTo(o.pos.x, o.pos.y);
                ctx.lineTo(o.pos.x - (o.vel.x/vMag)*trailLen, o.pos.y - (o.vel.y/vMag)*trailLen);
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = o.radius * 1.5;
                ctx.lineCap = 'round';
                ctx.stroke();
             }
        }

        ctx.beginPath(); 
        ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI*2); 
        ctx.fillStyle = color; 
        ctx.fill(); 
        ctx.strokeStyle = second; 
        ctx.lineWidth = 3; 
        ctx.stroke();
        
        if (label) { ctx.fillStyle = second; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.fillText(label, o.pos.x, o.pos.y + 4); }
        if (isGoalie) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.fillText('🧤', o.pos.x, o.pos.y + 6); }
        
        // Cooldown / Recovery Indicators (Tiny bar under player)
        if (o.recoveryTimer && o.recoveryTimer > 0) {
             ctx.fillStyle = '#ef4444';
             ctx.fillRect(o.pos.x - 10, o.pos.y + o.radius + 5, 20, 3);
        } else if (o.slideCooldown && o.slideCooldown > 0) {
             const pct = o.slideCooldown / SLIDE_COOLDOWN;
             ctx.fillStyle = '#eab308';
             ctx.fillRect(o.pos.x - 10, o.pos.y + o.radius + 5, 20 * pct, 3);
        }

        if (isActive) {
          const isKicking = o === (isMultiplayer || isPlayerHome ? leftPlayer.current : rightPlayer.current) ? keys.current['Space'] : keys.current['Enter']; 
          ctx.strokeStyle = isKicking ? 'rgba(255,255,255,1.0)' : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = isKicking ? 7 : 2; ctx.shadowBlur = isKicking ? 30 : 0; ctx.shadowColor = 'white';
          ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius + 6, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0;
        }
        
        ctx.restore();
      };
      
      // Determine if visual highlight should be on left or right player
      // P1 (WASD) always highlights
      // In multiplayer, P2 also highlights
      const p1IsLeft = isMultiplayer || isPlayerHome;
      
      drawObj(ball.current, '#ffffff', '#cbd5e1');
      drawObj(leftPlayer.current, homeTeam.color, homeTeam.secondaryColor, homeTeam.shortName, p1IsLeft);
      drawObj(rightPlayer.current, awayTeam.color, awayTeam.secondaryColor, awayTeam.shortName, isMultiplayer || !isPlayerHome);
      
      if (isGoalieMode) {
        drawObj(leftGoalie.current, homeTeam.color, homeTeam.secondaryColor, undefined, false, true);
        drawObj(rightGoalie.current, awayTeam.color, awayTeam.secondaryColor, undefined, false, true);
      }

      if (gameState === 'GOAL') {
        const bgOpacity = Math.min(goalAnimPhase * 2.5, 0.85);
        ctx.fillStyle = `rgba(2, 6, 23, ${bgOpacity})`; ctx.fillRect(0,0, GAME_WIDTH, GAME_HEIGHT);
        ctx.save();
        const scale = 0.5 + Math.sin(goalAnimPhase * Math.PI) * 0.7;
        const opacity = Math.min(goalAnimPhase * 5, 1);
        ctx.globalAlpha = opacity;
        ctx.translate(GAME_WIDTH/2, GAME_HEIGHT/2);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff'; ctx.font = '900 130px Orbitron'; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'; ctx.shadowBlur = 40;
        ctx.fillText(T.GOAL_EXCL, 0, 40);
        ctx.restore();
      } else if (gameState === 'KICKOFF') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        ctx.save();
        ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '900 italic 80px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(37, 99, 235, 0.5)'; // Blueish shadow
        ctx.shadowBlur = 30;
        ctx.fillText(T.GET_READY, 0, 0);
        ctx.restore();
      } else if (gameState === 'OVER') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 70px italic Arial';
        ctx.textAlign = 'center';
        ctx.fillText(T.GAME_OVER, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      }
    };

    const frame = (time: number) => { 
      const dt = Math.min(time - lastTime, 32); update(dt); draw(); lastTime = time; animationFrame = requestAnimationFrame(frame); 
    };
    animationFrame = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(animationFrame); };
  }, [gameState, score, homeTeam, awayTeam, onComplete, resetPositions, isPlayerHome, isMultiplayer, isGoalieMode, playSound, goalTop, goalBottom, duration, targetScore, goalAnimPhase, isFireMode, p1Active, p2Active, difficulty, weather, weatherSpeedMult, playerSpeedMod, playerShootMod, playerRestitution, slideImpulseMod, slideRecoveryMod]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 animate-in fade-in duration-700 relative">
      <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] flex items-center justify-between px-12 py-6 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-sport font-black text-sm shadow-xl border-2 border-white/5" style={{backgroundColor: homeTeam.color, color: homeTeam.secondaryColor}}>{homeTeam.shortName}</div>
          <div className="flex flex-col">
            <div className="font-sport font-bold text-base uppercase tracking-tight text-white">{homeTeam.name}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{T.P1_HOME}</div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-5xl font-sport font-black italic tracking-tighter text-white drop-shadow-md">{score.home} - {score.away}</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="px-4 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30">
              <span className="text-xs font-black text-blue-400 font-sport tabular-nums">
                {duration === 0 ? '∞' : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
            {!isMultiplayer && (
               <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border ${
                 difficulty === Difficulty.HARD ? 'text-rose-400 border-rose-500/30 bg-rose-500/10' : 
                 difficulty === Difficulty.NORMAL ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 
                 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
               }`}>
                 {difficulty}
               </div>
            )}
            <div className="text-lg">
               {weather === WeatherType.RAIN ? '🌧️' : (weather === WeatherType.SNOW ? '❄️' : '☀️')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-end">
            <div className="font-sport font-bold text-base uppercase tracking-tight text-white text-right">{awayTeam.name}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isMultiplayer ? T.P2_AWAY : T.AI_AWAY}</div>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-sport font-black text-sm shadow-xl border-2 border-white/5" style={{backgroundColor: awayTeam.color, color: awayTeam.secondaryColor}}>{awayTeam.shortName}</div>
        </div>
      </div>
      
      <div className="relative p-3 bg-slate-800 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-[10px] border-slate-700/50 overflow-hidden">
        <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} className="rounded-[2.5rem] shadow-inner" />
        
        {/* PowerUp Timers P1 */}
        <div className="absolute bottom-10 left-10 flex flex-col gap-2 pointer-events-none">
          {p1Active.map(pu => (
            <div key={pu.type} className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-white/10 animate-in slide-in-from-left">
              <span className="text-lg">{pu.type === PowerUpType.SPEED ? '⚡' : (pu.type === PowerUpType.KICK ? '👞' : '📏')}</span>
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(pu.duration / 10) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* PowerUp Timers P2 */}
        <div className="absolute bottom-10 right-10 flex flex-col items-end gap-2 pointer-events-none">
          {p2Active.map(pu => (
            <div key={pu.type} className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-white/10 animate-in slide-in-from-right">
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${(pu.duration / 10) * 100}%` }}></div>
              </div>
              <span className="text-lg">{pu.type === PowerUpType.SPEED ? '⚡' : (pu.type === PowerUpType.KICK ? '👞' : '📏')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-900/60 px-8 py-3 rounded-full border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-white/60">P1:</span>
          <div className="flex gap-1">
            <span className="bg-slate-700 px-2 py-1 rounded text-white shadow-sm">W/A/S/D</span>
          </div>
          <span className="bg-slate-700 px-2 py-1 rounded text-white shadow-sm">{T.L_SHIFT}</span>
          <span className="bg-blue-600 px-3 py-1 rounded text-white shadow-sm">{T.SPACE_KICK}</span>
        </div>
        
        {isMultiplayer && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-4">
              <span className="text-white/60">P2:</span>
              <div className="flex gap-1">
                <span className="bg-slate-700 px-2 py-1 rounded text-white shadow-sm">{T.ARROWS}</span>
              </div>
              <span className="bg-blue-600 px-3 py-1 rounded text-white shadow-sm">{T.ENTER_KICK}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;
