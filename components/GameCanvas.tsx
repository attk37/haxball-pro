
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GAME_WIDTH, GAME_HEIGHT, PITCH_MARGIN, GOAL_SIZE, GOAL_DEPTH,
  BALL_RADIUS, PLAYER_RADIUS, PLAYER_SPEED, PLAYER_MAX_SPEED,
  BALL_FRICTION, PLAYER_FRICTION, BOUNCE, KICK_FORCE, ALL_TEAMS
} from '../constants';
import { PhysicsObject, Vector2, PowerUpType, PowerUpItem, ActivePowerUp, Difficulty } from '../types';

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
  onComplete: (homeScore: number, awayScore: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ homeTeamId, awayTeamId, playerTeamId, duration, targetScore, isMultiplayer = false, isGoalieMode = false, isFireMode = false, difficulty, onComplete }) => {
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

  const homeTeam = ALL_TEAMS.find(t => t.id === homeTeamId)!;
  const awayTeam = ALL_TEAMS.find(t => t.id === awayTeamId)!;
  const isPlayerHome = homeTeamId === playerTeamId;

  const goalTop = (GAME_HEIGHT - GOAL_SIZE) / 2;
  const goalBottom = (GAME_HEIGHT + GOAL_SIZE) / 2;

  const ball = useRef<PhysicsObject>({
    pos: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: BALL_RADIUS, mass: 1, restitution: 0.8, friction: BALL_FRICTION
  });

  const leftPlayer = useRef<PhysicsObject>({
    pos: { x: GAME_WIDTH / 4, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: PLAYER_RADIUS, mass: 1.5, restitution: 0.4, friction: PLAYER_FRICTION
  });

  const rightPlayer = useRef<PhysicsObject>({
    pos: { x: (GAME_WIDTH * 3) / 4, y: GAME_HEIGHT / 2 },
    vel: { x: 0, y: 0 },
    radius: PLAYER_RADIUS, mass: 1.5, restitution: 0.4, friction: PLAYER_FRICTION
  });

  const goalieSpeed = 3.0;
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
    setGameState('KICKOFF');
    setGoalAnimPhase(0);
    setTimeout(() => { if(gameState !== 'OVER') setGameState('PLAYING'); }, 1500);
  }, [gameState]);

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

      const p1Move = { x: 0, y: 0 };
      if (keys.current['KeyW']) p1Move.y -= 1;
      if (keys.current['KeyS']) p1Move.y += 1;
      if (keys.current['KeyA']) p1Move.x -= 1;
      if (keys.current['KeyD']) p1Move.x += 1;
      
      const p1Slow = !!keys.current['ShiftLeft'];
      if (p1Move.x !== 0 || p1Move.y !== 0) {
        const mag = Math.sqrt(p1Move.x**2 + p1Move.y**2);
        const speedMultiplier = p1Slow ? 0.35 : 1.0;
        leftPlayer.current.vel.x += (p1Move.x / mag) * PLAYER_SPEED * speedMultiplier * p1SpeedMult;
        leftPlayer.current.vel.y += (p1Move.y / mag) * PLAYER_SPEED * speedMultiplier * p1SpeedMult;
      }

      if (p1Kick) {
        const dx = ball.current.pos.x - leftPlayer.current.pos.x;
        const dy = ball.current.pos.y - leftPlayer.current.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < leftPlayer.current.radius + ball.current.radius + 12) {
          ball.current.vel.x = (dx / dist) * KICK_FORCE * p1KickMult * 2.5; 
          ball.current.vel.y = (dy / dist) * KICK_FORCE * p1KickMult * 2.5;
          playSound('kick');
        }
      }

      if (isMultiplayer) {
        const p2Move = { x: 0, y: 0 };
        if (keys.current['ArrowUp']) p2Move.y -= 1;
        if (keys.current['ArrowDown']) p2Move.y += 1;
        if (keys.current['ArrowLeft']) p2Move.x -= 1;
        if (keys.current['ArrowRight']) p2Move.x += 1;

        const p2Slow = !!keys.current['ControlRight'] || !!keys.current['AltRight'];
        if (p2Move.x !== 0 || p2Move.y !== 0) {
          const mag = Math.sqrt(p2Move.x**2 + p2Move.y**2);
          const speedMultiplier = p2Slow ? 0.35 : 1.0;
          rightPlayer.current.vel.x += (p2Move.x / mag) * PLAYER_SPEED * speedMultiplier * p2SpeedMult;
          rightPlayer.current.vel.y += (p2Move.y / mag) * PLAYER_SPEED * speedMultiplier * p2SpeedMult;
        }

        if (p2Kick) {
          const dx = ball.current.pos.x - rightPlayer.current.pos.x;
          const dy = ball.current.pos.y - rightPlayer.current.pos.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < rightPlayer.current.radius + ball.current.radius + 12) {
            ball.current.vel.x = (dx / dist) * KICK_FORCE * p2KickMult * 2.5; 
            ball.current.vel.y = (dy / dist) * KICK_FORCE * p2KickMult * 2.5;
            playSound('kick');
          }
        }
      } else {
        const ai = isPlayerHome ? rightPlayer.current : leftPlayer.current;
        const aiTeam = isPlayerHome ? awayTeam : homeTeam;
        const aiModifier = (isPlayerHome ? p2SpeedMult : p1SpeedMult);
        
        // Base Speed influenced by team strength and difficulty
        const strengthFactor = 0.5 + aiTeam.strength / 200;
        const difficultyFactor = difficulty === Difficulty.EASY ? 0.8 : (difficulty === Difficulty.NORMAL ? 1.0 : 1.2);
        const aiSpeed = PLAYER_SPEED * strengthFactor * aiModifier * difficultyFactor;
        
        let targetX = ball.current.pos.x;
        let targetY = ball.current.pos.y;

        const oppGoalX = isPlayerHome ? PITCH_MARGIN : GAME_WIDTH - PITCH_MARGIN;
        const oppGoalY = GAME_HEIGHT / 2;

        if (difficulty !== Difficulty.EASY) {
          // OFFENSIVE ORIENTED AI
          // Calculate vector from ball to goal
          const dxBallToGoal = oppGoalX - ball.current.pos.x;
          const dyBallToGoal = oppGoalY - ball.current.pos.y;
          const distBallToGoal = Math.sqrt(dxBallToGoal**2 + dyBallToGoal**2) || 1;
          
          // AI wants to be behind the ball relative to the opponent's goal
          const offensiveOffset = difficulty === Difficulty.HARD ? 40 : 60;
          const offensiveTargetX = ball.current.pos.x - (dxBallToGoal / distBallToGoal) * offensiveOffset;
          const offensiveTargetY = ball.current.pos.y - (dyBallToGoal / distBallToGoal) * offensiveOffset;
          
          if (difficulty === Difficulty.HARD) {
            // Full offensive focus
            targetX = offensiveTargetX;
            targetY = offensiveTargetY;
          } else {
            // Normal: mix of follow and attack
            const bias = 0.6; // Higher bias towards offensive positioning
            targetX = (ball.current.pos.x * (1 - bias)) + (offensiveTargetX * bias);
            targetY = (ball.current.pos.y * (1 - bias)) + (offensiveTargetY * bias);
            
            // Occasionally "re-calculate" target to avoid being stuck in loops
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

        // AUTO-KICK LOGIC for AI
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
      }

      const physicsObjects = [leftPlayer.current, rightPlayer.current, ball.current];
      if (isGoalieMode) physicsObjects.push(leftGoalie.current, rightGoalie.current);

      physicsObjects.forEach(obj => {
        obj.pos.x += obj.vel.x;
        obj.pos.y += obj.vel.y;
        obj.vel.x *= obj.friction;
        obj.vel.y *= obj.friction;
        const speed = Math.sqrt(obj.vel.x**2 + obj.vel.y**2);
        const max = (obj === ball.current ? PLAYER_MAX_SPEED * 4 : PLAYER_MAX_SPEED);
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
          const relativeVelX = o1.vel.x - o2.vel.x;
          const relativeVelY = o1.vel.y - o2.vel.y;
          const dot = relativeVelX * normalX + relativeVelY * normalY;
          if (dot < 0) {
            const isBallInvolved = (o1 === ball.current || o2 === ball.current);
            let forceFactor = isBallInvolved ? 2.0 : 1.0;
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
      const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
      
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
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.translate(p.pos.x, p.pos.y);
        ctx.rotate(p.rotation);
        if (p.type === 'square') ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        else if (p.type === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
        else if (p.type === 'diamond') { ctx.beginPath(); ctx.moveTo(0, -p.size/2); ctx.lineTo(p.size/2, 0); ctx.lineTo(0, p.size/2); ctx.lineTo(-p.size/2, 0); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      const drawObj = (o: PhysicsObject, color: string, second: string, label?: string, isActive?: boolean, isGoalie?: boolean) => {
        ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = second; ctx.lineWidth = 3; ctx.stroke();
        if (label) { ctx.fillStyle = second; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.fillText(label, o.pos.x, o.pos.y + 4); }
        if (isGoalie) { ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center'; ctx.fillText('🧤', o.pos.x, o.pos.y + 6); }
        if (isActive) {
          const isKicking = o === leftPlayer.current ? keys.current['Space'] : keys.current['Enter']; 
          ctx.strokeStyle = isKicking ? 'rgba(255,255,255,1.0)' : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = isKicking ? 7 : 2; ctx.shadowBlur = isKicking ? 30 : 0; ctx.shadowColor = 'white';
          ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius + 6, 0, Math.PI*2); ctx.stroke(); ctx.shadowBlur = 0;
        }
      };
      drawObj(ball.current, '#ffffff', '#cbd5e1');
      drawObj(leftPlayer.current, homeTeam.color, homeTeam.secondaryColor, homeTeam.shortName, true);
      drawObj(rightPlayer.current, awayTeam.color, awayTeam.secondaryColor, awayTeam.shortName, isMultiplayer);
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
        ctx.fillText('GOAL!', 0, 40);
        ctx.restore();
      }
    };

    const frame = (time: number) => { 
      const dt = Math.min(time - lastTime, 32); update(dt); draw(); lastTime = time; animationFrame = requestAnimationFrame(frame); 
    };
    animationFrame = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(animationFrame); };
  }, [gameState, score, homeTeam, awayTeam, onComplete, resetPositions, isPlayerHome, isMultiplayer, isGoalieMode, playSound, goalTop, goalBottom, duration, targetScore, goalAnimPhase, isFireMode, p1Active, p2Active, difficulty]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 animate-in fade-in duration-700 relative">
      <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] flex items-center justify-between px-12 py-6 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-sport font-black text-sm shadow-xl border-2 border-white/5" style={{backgroundColor: homeTeam.color, color: homeTeam.secondaryColor}}>{homeTeam.shortName}</div>
          <div className="flex flex-col">
            <div className="font-sport font-bold text-base uppercase tracking-tight text-white">{homeTeam.name}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">P1 HOME</div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-5xl font-sport font-black italic tracking-tighter text-white drop-shadow-md">{score.home} - {score.away}</div>
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="px-4 py-0.5 bg-blue-500/20 rounded-full border border-blue-500/30">
              <span className="text-xs font-black text-blue-400 font-sport tabular-nums">
                {duration === 0 ? '∞' : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
            {!isMultiplayer && (
               <div className="text-[9px] font-black bg-white/5 px-2 rounded-full border border-white/10 text-white/40 uppercase tracking-widest">
                 AI: {difficulty}
               </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-end">
            <div className="font-sport font-bold text-base uppercase tracking-tight text-white text-right">{awayTeam.name}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{isMultiplayer ? 'P2 AWAY' : 'AI AWAY'}</div>
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
          <span className="bg-blue-600 px-3 py-1 rounded text-white shadow-sm">SPACE: KICK</span>
        </div>
        
        {isMultiplayer && (
          <>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-4">
              <span className="text-white/60">P2:</span>
              <div className="flex gap-1">
                <span className="bg-slate-700 px-2 py-1 rounded text-white shadow-sm">ARROWS</span>
              </div>
              <span className="bg-blue-600 px-3 py-1 rounded text-white shadow-sm">ENTER: KICK</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;
