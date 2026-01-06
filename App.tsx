
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ALL_TEAMS, LEAGUES, INITIAL_ACHIEVEMENTS, TRANSLATIONS } from './constants';
import { Team, Standing, Match, LeagueState, GameView, TransferOffer, FormResult, Difficulty, CareerHistoryEntry, Achievement, MatchRecordSimple, WeatherType, SkillTreeState } from './types';
import GameCanvas from './components/GameCanvas';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<GameView>(GameView.MENU);
  const [leagueState, setLeagueState] = useState<LeagueState | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [lastMatchResult, setLastMatchResult] = useState<{homeScore: number, awayScore: number} | null>(null);
  const [duration, setDuration] = useState(1); // 0 means Unlimited
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [isGoalieMode, setIsGoalieMode] = useState(false);
  const [isFireMode, setIsFireMode] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('tur1');
  const [transferOffers, setTransferOffers] = useState<TransferOffer[]>([]);
  const [wonTrophies, setWonTrophies] = useState<string[]>([]);
  
  // Settings States
  const [language, setLanguage] = useState<'EN' | 'TR'>('TR');
  const [isMusicOn, setIsMusicOn] = useState(false);
  
  // New States for Career History & Achievements & Manager Name & Skill Tree
  const [managerName, setManagerName] = useState<string>("The Manager");
  const [careerHistory, setCareerHistory] = useState<CareerHistoryEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  
  // Skill Tree State (Persistent)
  const [skillTree, setSkillTree] = useState<SkillTreeState>({
    levels: { speed: 0, shoot: 0, control: 0, defense: 0 },
    availablePoints: 0,
    totalPointsSpent: 0
  });
  
  const [multiplayerTeams, setMultiplayerTeams] = useState<{home: string | null, away: string | null}>({ home: null, away: null });

  const bgMusicRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const T = TRANSLATIONS[language];

  // Background Music Logic
  useEffect(() => {
    if (isMusicOn) {
      if (!bgMusicRef.current) {
        bgMusicRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = bgMusicRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (!oscRef.current) {
        // Simple ambient drone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime); // A2
        
        // Add a second oscillator for texture
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(55, ctx.currentTime); // A1
        
        const gain2 = ctx.createGain();
        gain2.gain.value = 0.05;

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.start();
        osc2.start();

        oscRef.current = osc; // Just tracking main osc for simplicity in cleanup
      }
    } else {
      if (bgMusicRef.current) {
        bgMusicRef.current.close().then(() => {
            bgMusicRef.current = null;
            oscRef.current = null;
            gainRef.current = null;
        });
      }
    }
  }, [isMusicOn]);

  // Update duration and sync with active league if it exists
  const handleSetDuration = (m: number) => {
    setDuration(m);
    if (leagueState) {
      setLeagueState(prev => prev ? { ...prev, matchDuration: m } : null);
    }
  };

  const checkAchievements = (newHistory: CareerHistoryEntry[]) => {
    setAchievements(prev => prev.map(a => {
      if (a.isUnlocked) return a;
      if (a.condition(newHistory, null)) return { ...a, isUnlocked: true };
      return a;
    }));
  };

  const simulateMatch = (match: Match, teamsInLeague: Team[]): { homeScore: number, awayScore: number } => {
    const homeTeam = teamsInLeague.find(t => t.id === match.homeTeamId)!;
    const awayTeam = teamsInLeague.find(t => t.id === match.awayTeamId)!;
    
    const homeStr = (homeTeam.strength - 60) / 40; 
    const awayStr = (awayTeam.strength - 60) / 40; 

    const homeExp = 0.8 + (homeStr * 1.5) + (Math.random() * 0.3);
    const awayExp = 0.6 + (awayStr * 1.5) + (Math.random() * 0.3);

    const getGoals = (exp: number) => {
      let g = 0;
      for(let i=0; i<6; i++) {
        if (Math.random() < (exp / (i + 1.8))) g++;
        else break;
      }
      return g;
    };

    return { homeScore: getGoals(homeExp), awayScore: getGoals(awayExp) };
  };

  const updateStandings = (standings: Standing[], match: Match, homeScore: number, awayScore: number): Standing[] => {
    return standings.map(s => {
      const isHome = s.teamId === match.homeTeamId;
      const isAway = s.teamId === match.awayTeamId;

      if (isHome || isAway) {
        const teamScore = isHome ? homeScore : awayScore;
        const opponentScore = isHome ? awayScore : homeScore;
        const result: 'G' | 'B' | 'M' = teamScore > opponentScore ? 'G' : (teamScore === opponentScore ? 'B' : 'M');
        
        let newFanSupport = s.fanSupport;
        if (result === 'G') newFanSupport = Math.min(100, newFanSupport + 10);
        else if (result === 'B') newFanSupport = Math.min(100, newFanSupport + 2);
        else newFanSupport = Math.max(0, newFanSupport - 15);

        const newFormEntry: FormResult = {
          matchId: match.id,
          opponentId: isHome ? match.awayTeamId : match.homeTeamId,
          homeScore,
          awayScore,
          result
        };

        const updatedForm = [newFormEntry, ...s.form].slice(0, 5);

        return {
          ...s, 
          played: s.played + 1, 
          won: s.won + (result === 'G' ? 1 : 0),
          drawn: s.drawn + (result === 'B' ? 1 : 0), 
          lost: s.lost + (result === 'M' ? 1 : 0),
          goalsFor: s.goalsFor + teamScore, 
          goalsAgainst: s.goalsAgainst + opponentScore,
          points: s.points + (result === 'G' ? 3 : (result === 'B' ? 1 : 0)),
          form: updatedForm,
          fanSupport: newFanSupport
        };
      }
      return s;
    });
  };

  const getRandomWeather = (): WeatherType => {
    const r = Math.random();
    if (r < 0.6) return WeatherType.SUNNY;
    if (r < 0.8) return WeatherType.RAIN;
    return WeatherType.SNOW;
  };

  const initLeague = (playerTeamId: string, leagueId: string, seasonNum: number = 1) => {
    const teamsInLeague = ALL_TEAMS.filter(t => t.leagueId === leagueId);
    const standings: Standing[] = teamsInLeague.map(t => ({
      teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      form: [], fanSupport: 50
    }));

    const weeks: Match[][] = [];
    const numTeams = teamsInLeague.length;
    const teamIds = teamsInLeague.map(t => t.id);
    const numWeeks = (numTeams - 1) * 2;
    const matchesPerWeek = numTeams / 2;

    for (let w = 0; w < numWeeks; w++) {
      const weekMatches: Match[] = [];
      const rotation = [...teamIds.slice(1)];
      const currentRotation = [teamIds[0], ...rotation.slice(rotation.length - (w % (numTeams - 1))), ...rotation.slice(0, rotation.length - (w % (numTeams - 1)))];
      for (let i = 0; i < matchesPerWeek; i++) {
        const homeId = w % 2 === 0 ? currentRotation[i] : currentRotation[numTeams - 1 - i];
        const awayId = w % 2 === 0 ? currentRotation[numTeams - 1 - i] : currentRotation[i];
        weekMatches.push({
          id: `w${w}-m${i}`, homeTeamId: homeId, awayTeamId: awayId, isCompleted: false,
          isPlayerMatch: homeId === playerTeamId || awayId === playerTeamId,
          weather: getRandomWeather()
        });
      }
      weeks.push(weekMatches);
    }

    setLeagueState({ 
      currentWeek: 0, 
      seasonNumber: seasonNum, 
      leagueId: leagueId,
      matches: weeks, 
      standings, 
      playerTeamId, 
      matchDuration: duration,
      targetScore,
      isGoalieMode,
      isFireMode,
      difficulty,
      trophies: wonTrophies
    });
    setView(GameView.DASHBOARD);
  };

  const handleSimWeek = () => {
    if (!leagueState) return;
    const weekIdx = leagueState.currentWeek;
    const currentMatches = leagueState.matches[weekIdx];
    const teamsInLeague = ALL_TEAMS.filter(t => t.leagueId === leagueState.leagueId);

    const matchResults = currentMatches.map(m => ({
      matchId: m.id,
      res: simulateMatch(m, teamsInLeague)
    }));

    setLeagueState(prev => {
      if (!prev) return prev;
      let nextStandings = [...prev.standings];
      const updatedWeeks = [...prev.matches];

      updatedWeeks[weekIdx] = updatedWeeks[weekIdx].map(m => {
        const result = matchResults.find(mr => mr.matchId === m.id);
        if (!result || m.isCompleted) return m; 
        
        nextStandings = updateStandings(nextStandings, m, result.res.homeScore, result.res.awayScore);
        return { ...m, homeScore: result.res.homeScore, awayScore: result.res.awayScore, isCompleted: true };
      });

      return { ...prev, matches: updatedWeeks, standings: nextStandings };
    });
  };

  const generateTransferOffers = (points: number, rank: number) => {
    const allAvailable = ALL_TEAMS.filter(t => t.id !== leagueState?.playerTeamId);
    let targetStrength = 70 + (points / 2);
    if (rank <= 3) targetStrength += 15;

    const pool = allAvailable.filter(t => t.strength <= targetStrength + 5 && t.strength >= targetStrength - 15);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const offers: TransferOffer[] = shuffled.slice(0, 3).map(t => ({
      teamId: t.id,
      salaryTier: t.strength > 90 ? 'LEGENDARY' : (t.strength > 80 ? 'PRO' : 'STARTER'),
      reason: rank <= 3 ? "Impressive championship run!" : "Solid season performance."
    }));
    setTransferOffers(offers);
    setView(GameView.TRANSFER_MARKET);
  };

  const onMatchEnd = (homeScore: number, awayScore: number) => {
    if (!activeMatch) return;
    setLastMatchResult({ homeScore, awayScore });

    // Unlock First Win Achievement if applicable
    if (activeMatch.isPlayerMatch && homeScore > awayScore) {
       setAchievements(prev => prev.map(a => a.id === 'first_win' && !a.isUnlocked ? { ...a, isUnlocked: true } : a));
    }
    
    // Skill Point Calculation (Only for player matches in career mode)
    if (activeMatch.id !== 'local-friendly' && leagueState) {
        const isHome = activeMatch.homeTeamId === leagueState.playerTeamId;
        const myScore = isHome ? homeScore : awayScore;
        const oppScore = isHome ? awayScore : homeScore;
        
        let earnedSP = 0;
        
        if (myScore > oppScore) {
            earnedSP += 1; // Win
            // Winning goal bonus (if won by 1 goal) - 25% chance
            if (myScore - oppScore === 1 && Math.random() < 0.25) {
                earnedSP += 1;
            }
        } else if (myScore === oppScore) {
            // Draw - 30% chance
            if (Math.random() < 0.30) {
                earnedSP += 1;
            }
        }
        // Loss = 0

        // Cap per match
        earnedSP = Math.min(earnedSP, 2);

        if (earnedSP > 0) {
            setSkillTree(prev => ({
                ...prev,
                availablePoints: prev.availablePoints + earnedSP
            }));
        }
    }
    
    if (activeMatch.id !== 'local-friendly' && leagueState) {
        setLeagueState(prev => {
          if (!prev) return prev;
          let nextStandings = [...prev.standings];
          const updatedMatches = [...prev.matches];
          const weekIdx = prev.currentWeek;
          const teamsInLeague = ALL_TEAMS.filter(t => t.leagueId === prev.leagueId);

          updatedMatches[weekIdx] = updatedMatches[weekIdx].map(m => {
            if (m.id === activeMatch.id) {
              nextStandings = updateStandings(nextStandings, m, homeScore, awayScore);
              return { ...m, homeScore, awayScore, isCompleted: true };
            }
            return m;
          });
          // Also simulate the rest of the week if they haven't been completed
          updatedMatches[weekIdx] = updatedMatches[weekIdx].map(m => {
            if (m.isCompleted) return m;
            const res = simulateMatch(m, teamsInLeague);
            nextStandings = updateStandings(nextStandings, m, res.homeScore, res.awayScore);
            return { ...m, homeScore: res.homeScore, awayScore: res.awayScore, isCompleted: true };
          });
          return { ...prev, matches: updatedMatches, standings: nextStandings };
        });
        setView(GameView.POST_MATCH);
    } else {
        // For Local Friendly, we can also show post match or just go to menu
        setView(GameView.POST_MATCH);
    }
  };

  const handleAdvance = () => {
    if (activeMatch?.id === 'local-friendly') {
        setView(GameView.MENU);
        return;
    }
    if (leagueState && leagueState.currentWeek >= leagueState.matches.length - 1) {
        // SEASON END LOGIC
        const sorted = [...leagueState.standings].sort((a,b) => b.points - a.points);
        const playerRank = sorted.findIndex(s => s.teamId === leagueState.playerTeamId) + 1;
        const playerStanding = sorted.find(s => s.teamId === leagueState.playerTeamId);
        const playerPoints = playerStanding?.points || 0;
        const won = playerRank === 1;

        if (won) {
          setWonTrophies(prev => [...prev, leagueState.leagueId]);
        }
        
        // Calculate Stats for History
        let biggestWin: MatchRecordSimple | null = null;
        let biggestLoss: MatchRecordSimple | null = null;
        let maxWinMargin = -1;
        let maxLossMargin = -1;

        leagueState.matches.flat().forEach(m => {
          if (!m.isCompleted) return;
          const isHome = m.homeTeamId === leagueState.playerTeamId;
          const isAway = m.awayTeamId === leagueState.playerTeamId;
          if (!isHome && !isAway) return;

          const myScore = isHome ? m.homeScore! : m.awayScore!;
          const oppScore = isHome ? m.awayScore! : m.homeScore!;
          const diff = myScore - oppScore;
          const opponentId = isHome ? m.awayTeamId : m.homeTeamId;

          if (diff > 0 && diff > maxWinMargin) {
             maxWinMargin = diff;
             biggestWin = { opponentId, score: `${myScore}-${oppScore}` };
          }
          if (diff < 0 && Math.abs(diff) > maxLossMargin) {
             maxLossMargin = Math.abs(diff);
             biggestLoss = { opponentId, score: `${myScore}-${oppScore}` }; 
          }
        });

        // Record History
        const entry: CareerHistoryEntry = {
          seasonNum: careerHistory.length + 1,
          teamId: leagueState.playerTeamId!,
          leagueId: leagueState.leagueId,
          rank: playerRank,
          points: playerPoints,
          wonTrophy: won,
          stats: {
            goalsFor: playerStanding?.goalsFor || 0,
            goalsAgainst: playerStanding?.goalsAgainst || 0,
            wins: playerStanding?.won || 0,
            draws: playerStanding?.drawn || 0,
            losses: playerStanding?.lost || 0,
            biggestWin,
            biggestLoss
          }
        };
        const newHistory = [...careerHistory, entry];
        setCareerHistory(newHistory);
        checkAchievements(newHistory);

        setView(GameView.SEASON_END);
    } else {
        setLeagueState(prev => prev ? ({ ...prev, currentWeek: prev.currentWeek + 1 }) : null);
        setView(GameView.DASHBOARD);
    }
  };

  const handleMultiplayerTeamSelect = (teamId: string) => {
    setMultiplayerTeams(prev => {
      if (!prev.home) {
        return { ...prev, home: teamId };
      }
      if (prev.home && !prev.away && teamId !== prev.home) {
        const match: Match = {
          id: 'local-friendly',
          homeTeamId: prev.home,
          awayTeamId: teamId,
          isCompleted: false,
          isPlayerMatch: true,
          weather: getRandomWeather()
        };
        setActiveMatch(match);
        setView(GameView.MATCH);
        return { home: null, away: null };
      }
      return prev;
    });
  };

  const getTeamById = (id: string) => ALL_TEAMS.find(t => t.id === id);

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center overflow-hidden">
      {view === GameView.MENU && (
        <div className="relative group text-center space-y-12 max-w-2xl w-full p-16 bg-slate-900/40 rounded-[3rem] border border-white/5 backdrop-blur-3xl overflow-y-auto max-h-[90vh]">
          <div className="absolute top-8 right-8">
             <button onClick={() => setView(GameView.SETTINGS)} className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg">
                ⚙️
             </button>
          </div>

          <h1 className="text-7xl font-sport font-black italic text-white drop-shadow-2xl">HAXBALL <span className="text-blue-500">PRO</span></h1>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{T.MATCH_TIME}</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[1, 2, 3, 0].map(m => (
                    <button key={m} onClick={() => handleSetDuration(m)} className={`w-12 py-2 rounded-xl font-sport font-bold border transition-colors ${duration === m ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-700/50'}`}>{m === 0 ? '∞' : m + "'"}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{T.TARGET_SCORE}</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[null, 3, 5, 10].map(s => (
                    <button key={s === null ? 'none' : s} onClick={() => !leagueState && setTargetScore(s)} className={`px-3 py-2 rounded-xl font-sport font-bold border transition-colors ${targetScore === s ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-700/50'} ${leagueState ? 'opacity-50 cursor-not-allowed' : ''}`}>{s === null ? 'None' : s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{T.BOT_DIFFICULTY}</label>
              <div className="flex justify-center gap-4">
                {[Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD].map(d => {
                  const isActive = difficulty === d;
                  let activeClasses = "";
                  if (isActive) {
                    if (d === Difficulty.EASY) activeClasses = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                    else if (d === Difficulty.NORMAL) activeClasses = "bg-amber-500 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]";
                    else activeClasses = "bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]";
                  } else {
                    activeClasses = "bg-slate-800/50 border-white/5 text-slate-400";
                  }
                  
                  return (
                    <button 
                      key={d} 
                      disabled={!!leagueState}
                      onClick={() => setDifficulty(d)} 
                      className={`px-4 py-2 rounded-xl font-sport font-bold border transition-all ${activeClasses} ${leagueState ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-4 text-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{T.GAME_MODES}</label>
              <div className="flex justify-center gap-4">
                <button 
                  disabled={!!leagueState}
                  onClick={() => setIsGoalieMode(!isGoalieMode)} 
                  className={`px-6 py-3 rounded-xl font-sport font-bold border transition-all ${isGoalieMode ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800/50 border-white/5 text-slate-400'} ${leagueState ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                >
                  {isGoalieMode ? `${T.GOALIE} 🧤` : T.GOALIE}
                </button>
                <button 
                  disabled={!!leagueState}
                  onClick={() => setIsFireMode(!isFireMode)} 
                  className={`px-6 py-3 rounded-xl font-sport font-bold border transition-all ${isFireMode ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]' : 'bg-slate-800/50 border-white/5 text-slate-400'} ${leagueState ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                >
                  {isFireMode ? `${T.FIRE} 🔥` : T.FIRE}
                </button>
              </div>
              {leagueState && <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">{T.MODS_LOCKED}</p>}
            </div>

            <div className="flex flex-col gap-4">
              {leagueState && (
                <button onClick={() => setView(GameView.DASHBOARD)} className="bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform border border-blue-400/50 group">
                  {T.CONTINUE_CAREER} <span className="text-xl group-hover:translate-x-1 transition-transform">▶️</span>
                </button>
              )}
              <div className="flex gap-4">
                <button onClick={() => setView(GameView.MANAGER_SETUP)} className="flex-1 bg-white text-slate-950 py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform">
                  {T.START_NEW} <span className="text-blue-600">⚽</span>
                </button>
                <button onClick={() => setView(GameView.CAREER_PROFILE)} className="flex-1 bg-slate-800 text-white py-5 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform border border-white/5">
                  {T.PROFILE} 👤
                </button>
              </div>
              <button onClick={() => setView(GameView.MULTIPLAYER_SELECT)} className="bg-slate-800 text-slate-400 py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform">
                {T.LOCAL_2P} 🤜🤛
              </button>
            </div>
          </div>
        </div>
      )}

      {view === GameView.SETTINGS && (
        <div className="w-full max-w-2xl p-16 bg-slate-900/40 rounded-[3rem] border border-white/5 backdrop-blur-3xl animate-in slide-in-from-bottom">
           <h2 className="text-4xl font-sport font-black italic text-center mb-12">{T.SETTINGS}</h2>
           
           <div className="space-y-8">
              <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                 <span className="font-bold text-lg text-slate-300">{T.LANGUAGE}</span>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setLanguage('TR')} 
                      className={`px-6 py-2 rounded-lg font-black transition-all ${language === 'TR' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                      TR
                    </button>
                    <button 
                      onClick={() => setLanguage('EN')} 
                      className={`px-6 py-2 rounded-lg font-black transition-all ${language === 'EN' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                      EN
                    </button>
                 </div>
              </div>

              <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                 <span className="font-bold text-lg text-slate-300">{T.MUSIC}</span>
                 <button 
                   onClick={() => setIsMusicOn(!isMusicOn)} 
                   className={`w-32 py-2 rounded-lg font-black transition-all flex items-center justify-center gap-2 ${isMusicOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                 >
                   {isMusicOn ? `🔊 ${T.ON}` : `🔇 ${T.OFF}`}
                 </button>
              </div>
           </div>

           <div className="mt-12">
              <button onClick={() => setView(GameView.MENU)} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors border border-white/5">
                {T.BACK}
              </button>
           </div>
        </div>
      )}

      {view === GameView.MANAGER_SETUP && (
        <div className="w-full max-w-2xl p-16 bg-slate-900/40 rounded-[3rem] border border-white/5 backdrop-blur-3xl animate-in slide-in-from-bottom">
           <h2 className="text-4xl font-sport font-black italic text-center mb-8">{T.MANAGER_IDENTITY}</h2>
           
           <div className="space-y-8">
              <div className="flex flex-col gap-3">
                 <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">{T.ENTER_NAME}</label>
                 <input 
                   type="text" 
                   value={managerName}
                   onChange={(e) => setManagerName(e.target.value)}
                   className="w-full bg-slate-950/60 border border-white/10 rounded-2xl p-5 text-2xl font-bold text-white focus:outline-none focus:border-blue-500 transition-colors text-center shadow-inner"
                   placeholder="Your Name"
                   maxLength={15}
                   autoFocus
                 />
              </div>

              <div className="flex gap-4 pt-4">
                 <button onClick={() => setView(GameView.MENU)} className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors">{T.CANCEL}</button>
                 <button 
                  onClick={() => {
                     if(managerName.trim()) setView(GameView.LEAGUE_SELECT);
                  }} 
                  className={`flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all ${managerName.trim() ? 'hover:scale-[1.02]' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!managerName.trim()}
                 >
                   {T.CONTINUE} ➔
                 </button>
              </div>
           </div>
        </div>
      )}

      {view === GameView.CAREER_PROFILE && (
        <div className="w-full max-w-7xl h-full p-12 flex flex-col gap-10 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center">
             <h2 className="text-5xl font-sport font-black italic uppercase">{T.MANAGER_PROFILE}</h2>
             <button onClick={() => setView(GameView.MENU)} className="bg-slate-800 px-6 py-2 rounded-xl font-bold">{T.BACK}</button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-hidden">
            {/* Left Col: Stats Summary */}
            <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-3xl flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-4xl shadow-xl">👤</div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Manager</div>
                  <div className="text-2xl font-bold">{managerName}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-black uppercase">{T.TOTAL_SEASONS}</div>
                  <div className="text-3xl font-sport font-black">{careerHistory.length}</div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-black uppercase">{T.TROPHIES_WON}</div>
                  <div className="text-3xl font-sport font-black text-yellow-500">{careerHistory.filter(h => h.wonTrophy).length}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{T.ACHIEVEMENTS}</h3>
                 <div className="grid grid-cols-4 gap-2">
                   {achievements.map(ach => (
                     <div key={ach.id} title={ach.title + ": " + ach.description} className={`aspect-square rounded-xl flex items-center justify-center text-2xl border transition-all cursor-help ${ach.isUnlocked ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-slate-950/50 border-white/5 grayscale opacity-30'}`}>
                       {ach.icon}
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            {/* Right Col: Season History */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-[3rem] p-8 backdrop-blur-3xl flex flex-col overflow-hidden">
              <h3 className="text-xl font-sport font-black uppercase italic mb-6">{T.HISTORY_LOG}</h3>
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {careerHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-600 font-bold italic">
                    <span className="text-4xl mb-2">📂</span>
                    NO HISTORY YET
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="text-[10px] text-slate-500 font-black uppercase tracking-widest sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10">
                      <tr>
                        <th className="pb-4 pl-4">Season</th>
                        <th className="pb-4">Club</th>
                        <th className="pb-4">League</th>
                        <th className="pb-4 text-center">Rank</th>
                        <th className="pb-4 text-center">Points</th>
                        <th className="pb-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {careerHistory.slice().reverse().map((entry, idx) => {
                        const team = getTeamById(entry.teamId);
                        const league = LEAGUES.find(l => l.id === entry.leagueId);
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="py-4 pl-4 font-sport font-bold text-slate-400">#{entry.seasonNum}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-white/10" style={{backgroundColor: team?.color, color: team?.secondaryColor}}>
                                  {team?.shortName}
                                </div>
                                <span className="text-sm font-bold">{team?.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-xs text-slate-400">{league?.name}</td>
                            <td className="py-4 text-center font-bold">
                              {entry.rank === 1 ? <span className="text-yellow-400">1st 👑</span> : <span className="text-slate-300">{entry.rank}</span>}
                            </td>
                            <td className="py-4 text-center font-sport font-bold">{entry.points}</td>
                            <td className="py-4 text-center">
                              {entry.wonTrophy ? <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-[10px] font-black uppercase">Champion</span> : <span className="text-slate-600 text-[10px] font-black uppercase">Finished</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === GameView.LEAGUE_SELECT && (
        <div className="w-full max-w-7xl h-full p-12 flex flex-col gap-10 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center">
             <h2 className="text-5xl font-sport font-black italic uppercase">{T.SELECT_LEAGUE}</h2>
             <button onClick={() => setView(GameView.MENU)} className="bg-slate-800 px-6 py-2 rounded-xl font-bold">{T.BACK}</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 overflow-y-auto">
             {LEAGUES.map(lg => (
               <button key={lg.id} onClick={() => { setSelectedLeagueId(lg.id); setView(GameView.TEAM_SELECT); }} className="bg-slate-900 p-8 rounded-3xl border border-white/5 hover:border-blue-500/50 transition-all group">
                 <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{lg.icon}</div>
                 <div className="font-sport font-bold text-xs uppercase text-slate-300">{lg.name}</div>
               </button>
             ))}
          </div>
        </div>
      )}

      {(view === GameView.TEAM_SELECT || view === GameView.MULTIPLAYER_SELECT) && (
        <div className="w-full max-w-7xl h-full p-12 flex flex-col gap-10">
          <div className="flex justify-between items-center">
            <h2 className="text-5xl font-sport font-black italic uppercase">{view === GameView.TEAM_SELECT ? T.CHOOSE_CLUB : T.LOCAL_MATCH_SELECTION}</h2>
            <button onClick={() => setView(GameView.LEAGUE_SELECT)} className="bg-slate-800 px-6 py-2 rounded-xl font-bold">{T.BACK}</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 overflow-y-auto pb-10">
            {ALL_TEAMS.filter(t => view === GameView.MULTIPLAYER_SELECT ? true : t.leagueId === selectedLeagueId).sort((a,b) => b.strength - a.strength).map(team => (
              <button key={team.id} disabled={team.id === multiplayerTeams.home} onClick={() => view === GameView.TEAM_SELECT ? initLeague(team.id, selectedLeagueId) : handleMultiplayerTeamSelect(team.id)} className={`relative h-56 rounded-3xl overflow-hidden bg-slate-900 border border-white/5 ${team.id === multiplayerTeams.home ? 'opacity-20' : 'hover:scale-105 transition-all'}`}>
                <div className="absolute inset-0 opacity-40" style={{ background: `linear-gradient(135deg, ${team.color}, ${team.secondaryColor})` }}></div>
                <div className="relative h-full p-6 flex flex-col justify-between items-center text-center">
                   <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-sport font-black bg-white/10 shadow-lg">{team.shortName}</div>
                   <div className="font-sport font-bold text-sm uppercase tracking-tight text-white">{team.name}</div>
                   <div className="text-[10px] font-black bg-black/40 px-3 py-1 rounded-full text-blue-400">OVR {team.strength}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === GameView.DASHBOARD && leagueState && (
        <Dashboard 
          leagueState={leagueState} 
          managerName={managerName}
          setManagerName={setManagerName}
          careerHistory={careerHistory}
          achievements={achievements}
          skillTree={skillTree}
          setSkillTree={setSkillTree}
          language={language}
          onPlayNext={() => {
            const match = leagueState.matches[leagueState.currentWeek].find(m => m.isPlayerMatch);
            if (match) { setActiveMatch(match); setView(GameView.MATCH); }
          }} 
          onSimWeek={handleSimWeek}
          onAdvance={handleAdvance}
          onExit={() => setView(GameView.MENU)}
        />
      )}

      {view === GameView.MATCH && activeMatch && (
        <GameCanvas 
          homeTeamId={activeMatch.homeTeamId}
          awayTeamId={activeMatch.awayTeamId}
          playerTeamId={leagueState?.playerTeamId || activeMatch.homeTeamId}
          isMultiplayer={activeMatch.id === 'local-friendly'}
          isGoalieMode={leagueState?.isGoalieMode || isGoalieMode}
          isFireMode={leagueState?.isFireMode || isFireMode}
          difficulty={leagueState?.difficulty || difficulty}
          duration={(leagueState ? leagueState.matchDuration : duration) * 60}
          targetScore={leagueState ? leagueState.targetScore : targetScore}
          weather={activeMatch.weather || WeatherType.SUNNY}
          onComplete={onMatchEnd}
          T={T}
          skillTree={activeMatch.id !== 'local-friendly' ? skillTree : undefined}
        />
      )}

      {view === GameView.POST_MATCH && activeMatch && lastMatchResult && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-[100] animate-in fade-in duration-500">
           <div className="max-w-4xl w-full bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[4rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.8)] flex flex-col items-center gap-12 text-center">
              <div className="space-y-4">
                 <h2 className="text-slate-500 font-black uppercase tracking-[0.4em] text-xs">Full Time Result</h2>
                 <div className="text-6xl font-sport font-black italic text-white">MATCH COMPLETED</div>
              </div>

              <div className="flex items-center justify-center gap-16 w-full py-8 border-y border-white/5">
                 <div className="flex-1 flex flex-col items-center gap-6">
                    <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-5xl font-sport font-black shadow-2xl border-4 border-white/10" style={{ backgroundColor: getTeamById(activeMatch.homeTeamId)?.color, color: getTeamById(activeMatch.homeTeamId)?.secondaryColor }}>
                       {getTeamById(activeMatch.homeTeamId)?.shortName}
                    </div>
                    <div className="text-2xl font-sport font-bold uppercase text-white tracking-tighter">
                       {getTeamById(activeMatch.homeTeamId)?.name}
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-2">
                    <div className="text-8xl font-sport font-black italic text-white flex gap-6 tabular-nums">
                       <span className={lastMatchResult.homeScore > lastMatchResult.awayScore ? 'text-blue-500' : ''}>{lastMatchResult.homeScore}</span>
                       <span className="text-slate-800">-</span>
                       <span className={lastMatchResult.awayScore > lastMatchResult.homeScore ? 'text-blue-500' : ''}>{lastMatchResult.awayScore}</span>
                    </div>
                    {lastMatchResult.homeScore === lastMatchResult.awayScore ? (
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 bg-amber-500/10 px-4 py-1 rounded-full">Draw</div>
                    ) : (
                       <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 bg-blue-500/10 px-4 py-1 rounded-full">Winner: {lastMatchResult.homeScore > lastMatchResult.awayScore ? getTeamById(activeMatch.homeTeamId)?.name : getTeamById(activeMatch.awayTeamId)?.name}</div>
                    )}
                 </div>

                 <div className="flex-1 flex flex-col items-center gap-6">
                    <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-5xl font-sport font-black shadow-2xl border-4 border-white/10" style={{ backgroundColor: getTeamById(activeMatch.awayTeamId)?.color, color: getTeamById(activeMatch.awayTeamId)?.secondaryColor }}>
                       {getTeamById(activeMatch.awayTeamId)?.shortName}
                    </div>
                    <div className="text-2xl font-sport font-bold uppercase text-white tracking-tighter text-center">
                       {getTeamById(activeMatch.awayTeamId)?.name}
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => {
                   if (activeMatch.id === 'local-friendly') {
                      setView(GameView.MENU);
                   } else {
                      setView(GameView.DASHBOARD);
                   }
                }}
                className="w-full max-w-md bg-white text-slate-950 py-5 rounded-2xl font-sport font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                {activeMatch.id === 'local-friendly' ? 'BACK TO MENU' : 'CONTINUE TO DASHBOARD'}
              </button>
           </div>
        </div>
      )}

      {view === GameView.SEASON_END && leagueState && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-20 z-50 animate-in fade-in">
          <div className="max-w-4xl w-full text-center space-y-12 bg-slate-900/40 p-16 rounded-[4rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
            <h1 className="text-7xl font-sport font-black italic text-yellow-400">SEASON COMPLETED</h1>
            <div className="space-y-4">
                <p className="text-slate-500 font-bold uppercase tracking-widest">Final Placement</p>
                <div className="text-4xl font-sport font-black text-white italic">
                  RANK #{([...leagueState.standings].sort((a,b) => b.points - a.points).findIndex(s => s.teamId === leagueState.playerTeamId) + 1)}
                </div>
            </div>
            <button 
              onClick={() => {
                const s = [...leagueState.standings].sort((a,b) => b.points - a.points);
                const rank = s.findIndex(st => st.teamId === leagueState.playerTeamId) + 1;
                const points = s.find(st => st.teamId === leagueState.playerTeamId)?.points || 0;
                generateTransferOffers(points, rank);
              }} 
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-sport font-black text-2xl"
            >
              VIEW TRANSFER OFFERS
            </button>
          </div>
        </div>
      )}

      {view === GameView.TRANSFER_MARKET && (
        <div className="w-full max-w-7xl h-full p-12 flex flex-col gap-10 animate-in slide-in-from-right">
           <div className="flex justify-between items-center">
              <h2 className="text-5xl font-sport font-black italic uppercase">Transfer <span className="text-blue-500">Market</span></h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-slate-900/60 p-10 rounded-[3rem] border-2 border-slate-700 flex flex-col justify-between">
                 <div>
                   <h3 className="text-2xl font-sport font-bold mb-4">Stay at Club</h3>
                   <p className="text-slate-500 text-sm">Continue your legacy with your current team.</p>
                 </div>
                 <button onClick={() => initLeague(leagueState!.playerTeamId!, leagueState!.leagueId, leagueState!.seasonNumber + 1)} className="mt-8 bg-slate-800 py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all">STAY</button>
              </div>
              {transferOffers.map(offer => {
                const t = ALL_TEAMS.find(tm => tm.id === offer.teamId)!;
                const lg = LEAGUES.find(l => l.id === t.leagueId)!;
                return (
                  <div key={offer.teamId} className="bg-slate-900/60 p-10 rounded-[3rem] border-2 border-blue-500/20 flex flex-col justify-between group hover:border-blue-500/50 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-12 h-12 rounded-xl flex items-center justify-center font-sport font-black bg-white/10" style={{backgroundColor: t.color, color: t.secondaryColor}}>{t.shortName}</div>
                         <div>
                           <div className="text-xs text-slate-500 font-bold uppercase">{lg.name}</div>
                           <div className="text-lg font-bold">{t.name}</div>
                         </div>
                      </div>
                      <div className="space-y-3">
                        <div className="text-[10px] font-black bg-blue-500/10 text-blue-400 p-2 rounded-lg text-center uppercase tracking-widest">{offer.salaryTier} OFFER</div>
                        <p className="text-slate-500 text-xs italic">"{offer.reason}"</p>
                      </div>
                    </div>
                    <button onClick={() => initLeague(t.id, t.leagueId, leagueState!.seasonNumber + 1)} className="mt-8 bg-blue-600 py-4 rounded-2xl font-bold group-hover:bg-blue-500 transition-all">SIGN CONTRACT</button>
                  </div>
                )
              })}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
