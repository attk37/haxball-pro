
import React, { useState } from 'react';
import { LeagueState, Match, CareerHistoryEntry, Achievement, WeatherType, SkillTreeState, SkillBranch } from '../types';
import { ALL_TEAMS, LEAGUES, TRANSLATIONS } from '../constants';
import StandingsTable from './StandingsTable';

interface DashboardProps {
  leagueState: LeagueState;
  managerName: string;
  setManagerName: (name: string) => void;
  careerHistory: CareerHistoryEntry[];
  achievements: Achievement[];
  skillTree: SkillTreeState;
  setSkillTree: React.Dispatch<React.SetStateAction<SkillTreeState>>;
  language: 'EN' | 'TR';
  onPlayNext: () => void;
  onSimWeek: () => void;
  onAdvance: () => void;
  onExit?: () => void;
}

type DashboardTab = 'standings' | 'profile' | 'settings' | 'skills';

const Dashboard: React.FC<DashboardProps> = ({ leagueState, managerName, setManagerName, careerHistory, achievements, skillTree, setSkillTree, language, onPlayNext, onSimWeek, onAdvance, onExit }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('standings');
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);

  const T = TRANSLATIONS[language];
  const playerTeam = ALL_TEAMS.find(t => t.id === leagueState.playerTeamId)!;
  const currentMatches = leagueState.matches[leagueState.currentWeek] || [];
  const playerMatch = currentMatches.find(m => m.isPlayerMatch);
  const otherMatches = currentMatches.filter(m => !m.isPlayerMatch);
  const standing = leagueState.standings.find(s => s.teamId === playerTeam.id);
  
  const isWeekFinished = currentMatches.every(m => m.isCompleted);

  const getTeamName = (id: string) => ALL_TEAMS.find(t => t.id === id)?.name || id;
  const getTeamShort = (id: string) => ALL_TEAMS.find(t => t.id === id)?.shortName || id;
  const getTeamColor = (id: string) => ALL_TEAMS.find(t => t.id === id)?.color || '#000';
  const getTeamSecondary = (id: string) => ALL_TEAMS.find(t => t.id === id)?.secondaryColor || '#fff';
  const getTeamById = (id: string) => ALL_TEAMS.find(t => t.id === id);

  const getWeatherIcon = (w: WeatherType) => {
    switch(w) {
      case WeatherType.RAIN: return '🌧️';
      case WeatherType.SNOW: return '❄️';
      default: return '☀️';
    }
  };
  
  const getWeatherName = (w: WeatherType) => {
    switch(w) {
      case WeatherType.RAIN: return 'Rainy';
      case WeatherType.SNOW: return 'Snowy';
      default: return 'Sunny';
    }
  };

  // Skill Tree Logic
  const MAX_SKILL_POINTS_SPENT = 55;
  const BASE_COSTS = [2, 4, 7, 11, 16]; // Levels 1 to 5

  const hasTier4 = Object.values(skillTree.levels).some(level => level >= 4);
  const costMultiplier = hasTier4 ? 1.2 : 1.0;

  const getSkillCost = (levelIndex: number) => {
    return Math.ceil(BASE_COSTS[levelIndex] * costMultiplier);
  };

  const canUpgrade = (branch: SkillBranch, nextLevel: number) => {
    const cost = getSkillCost(nextLevel - 1);
    if (skillTree.availablePoints < cost) return false;
    if (skillTree.totalPointsSpent + cost > MAX_SKILL_POINTS_SPENT) return false;
    if (skillTree.levels[branch] !== nextLevel - 1) return false; // Must upgrade sequentially
    return true;
  };

  const handleUpgrade = (branch: SkillBranch, level: number) => {
    if (!canUpgrade(branch, level)) return;
    const cost = getSkillCost(level - 1);
    setSkillTree(prev => ({
      ...prev,
      levels: { ...prev.levels, [branch]: level },
      availablePoints: prev.availablePoints - cost,
      totalPointsSpent: prev.totalPointsSpent + cost
    }));
  };

  const getBranchLabel = (b: SkillBranch) => {
    switch(b) {
      case 'speed': return T.S_SPEED;
      case 'shoot': return T.S_SHOOT;
      case 'control': return T.S_CONTROL;
      case 'defense': return T.S_DEFENSE;
    }
  };

  const getBranchDesc = (b: SkillBranch) => {
    switch(b) {
      case 'speed': return T.S_SPEED_DESC;
      case 'shoot': return T.S_SHOOT_DESC;
      case 'control': return T.S_CONTROL_DESC;
      case 'defense': return T.S_DEFENSE_DESC;
    }
  };

  return (
    <div className="w-full h-full flex p-8 gap-8 animate-in fade-in duration-1000 overflow-hidden">
      {/* Side Profile */}
      <div className="w-[420px] flex flex-col gap-8 flex-shrink-0">
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl">
          <div className="flex flex-col items-center text-center gap-4">
             <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center text-4xl font-sport font-black shadow-2xl border-4 border-white/10" style={{ backgroundColor: playerTeam.color, color: playerTeam.secondaryColor }}>
               {playerTeam.shortName}
             </div>
             <div>
               <h2 className="text-3xl font-sport font-black uppercase italic tracking-tighter leading-none">{playerTeam.name}</h2>
               <div className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">
                 Manager: <span className="text-white">{managerName}</span>
               </div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
               <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Matchweek</div>
               <div className="text-2xl font-sport font-bold text-white">{leagueState.currentWeek + 1}</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
               <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Points</div>
               <div className="text-2xl font-sport font-bold text-blue-500">{standing?.points || 0}</div>
            </div>
          </div>

          {/* Fan Support Bar */}
          <div className="mt-8 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Fan Support</span>
              <span className="text-white">{standing?.fanSupport || 50}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000" 
                style={{ width: `${standing?.fanSupport || 50}%` }}
              ></div>
            </div>
          </div>

          {/* Trophy Cabinet */}
          <div className="mt-8 border-t border-white/5 pt-6">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Trophy Cabinet</h4>
             <div className="flex gap-3 flex-wrap">
               {leagueState.trophies.length > 0 ? (
                 leagueState.trophies.map((tid, i) => {
                   const lg = LEAGUES.find(l => l.id === tid);
                   return (
                     <div 
                        key={`${tid}-${i}`} 
                        title={lg?.trophyName || 'League Champion'} 
                        className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-xl shadow-inner border border-yellow-500/30 cursor-help transition-transform hover:scale-110"
                     >
                       {lg?.trophyIcon || '🏆'}
                     </div>
                   );
                 })
               ) : (
                 <p className="text-[10px] text-slate-700 italic font-bold">No trophies won yet.</p>
               )}
             </div>
          </div>
        </div>

        {playerMatch ? (
          <div className="bg-slate-900/40 border border-blue-500/20 rounded-[2.5rem] p-8 backdrop-blur-3xl flex-1 flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/30"></div>
            <h3 className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] mb-6 text-center">Your Matchweek</h3>
            
            <div className="flex flex-col items-center justify-center py-4 mb-4 border-b border-white/5">
              <div className="flex items-center gap-6 w-full">
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-sport font-black text-xl shadow-lg border-2 border-white/5" style={{ backgroundColor: getTeamColor(playerMatch.homeTeamId), color: getTeamSecondary(playerMatch.homeTeamId) }}>{getTeamShort(playerMatch.homeTeamId)}</div>
                  <div className="text-[10px] font-black uppercase text-slate-300 text-center truncate w-full">{getTeamName(playerMatch.homeTeamId)}</div>
                </div>
                <div className="flex flex-col items-center gap-3">
                  {playerMatch.isCompleted ? (
                    <div className="text-3xl font-sport font-black italic text-blue-400 flex gap-3">
                      <span>{playerMatch.homeScore}</span>
                      <span className="text-slate-700">-</span>
                      <span>{playerMatch.awayScore}</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-sport font-black italic text-slate-700">VS</div>
                  )}
                  {/* Weather Indicator */}
                  <div className={`px-3 py-1 rounded-full border border-white/5 text-[10px] font-black uppercase flex items-center gap-1 ${playerMatch.weather === WeatherType.SUNNY ? 'bg-amber-500/10 text-amber-400' : (playerMatch.weather === WeatherType.RAIN ? 'bg-blue-500/10 text-blue-400' : 'bg-white/10 text-white')}`}>
                    <span>{getWeatherIcon(playerMatch.weather)}</span>
                    <span>{getWeatherName(playerMatch.weather)}</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-sport font-black text-xl shadow-lg border-2 border-white/5" style={{ backgroundColor: getTeamColor(playerMatch.awayTeamId), color: getTeamSecondary(playerMatch.awayTeamId) }}>{getTeamShort(playerMatch.awayTeamId)}</div>
                  <div className="text-[10px] font-black uppercase text-slate-300 text-center truncate w-full">{getTeamName(playerMatch.awayTeamId)}</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3 sticky top-0 bg-slate-900/40 backdrop-blur-sm pb-2">Results Breakdown</h4>
              <div className="space-y-3">
                {otherMatches.map(m => (
                  <div key={m.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-2 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3 w-[42%] overflow-hidden">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-md" style={{ backgroundColor: getTeamColor(m.homeTeamId), color: getTeamSecondary(m.homeTeamId) }}>{getTeamShort(m.homeTeamId)}</div>
                      <div className="text-[11px] font-bold uppercase text-slate-400 truncate">{getTeamName(m.homeTeamId)}</div>
                    </div>
                    <div className="flex-shrink-0 text-center font-sport font-bold text-sm bg-black/20 px-3 py-1 rounded-full border border-white/5 min-w-[50px]">
                      {m.isCompleted ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className={m.homeScore! > m.awayScore! ? 'text-blue-400' : 'text-slate-400'}>{m.homeScore}</span>
                          <span className="text-slate-700 font-light">-</span>
                          <span className={m.awayScore! > m.homeScore! ? 'text-blue-400' : 'text-slate-400'}>{m.awayScore}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600">VS</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-3 w-[42%] text-right overflow-hidden">
                      <div className="text-[11px] font-bold uppercase text-slate-400 truncate">{getTeamName(m.awayTeamId)}</div>
                      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-md" style={{ backgroundColor: getTeamColor(m.awayTeamId), color: getTeamSecondary(m.awayTeamId) }}>{getTeamShort(m.awayTeamId)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {isWeekFinished ? (
                <button 
                  onClick={onAdvance}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-sport font-black text-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-600/20"
                >
                  NEXT MATCHWEEK ➔
                </button>
              ) : (
                <>
                  <button 
                    onClick={onPlayNext}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-sport font-black text-xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-blue-600/20"
                  >
                    PLAY MATCH
                  </button>
                  <button 
                    onClick={onSimWeek}
                    className="w-full bg-slate-800/80 hover:bg-slate-700 py-3 rounded-2xl font-sport font-bold text-xs transition-all text-slate-300 border border-white/10 uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    Sim Week ⚡
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl flex-1 flex items-center justify-center text-slate-600 font-bold uppercase tracking-widest text-xs italic text-center">
            Season Conclusion Reached
            {onExit && (
              <button 
                onClick={onExit}
                className="mt-4 block w-full bg-slate-800 py-3 rounded-xl text-white font-bold"
              >
                BACK TO MENU
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area with Navigation */}
      <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-[3rem] backdrop-blur-3xl overflow-hidden flex flex-col p-8 relative">
        
        {/* Navigation Bar */}
        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
           <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('standings')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'standings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
              >
                {T.LEAGUE_TABLE}
              </button>
              <button 
                onClick={() => setActiveTab('skills')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'skills' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
              >
                {T.SKILL_TREE}
              </button>
              <button 
                onClick={() => setActiveTab('profile')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
              >
                {T.MANAGER_PROFILE}
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
              >
                {T.SETTINGS_TAB}
              </button>
           </div>
           
           <div className="flex items-center gap-4">
            {onExit && (
              <button 
                onClick={onExit}
                className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-rose-600 transition-all border border-white/10 flex items-center justify-center text-lg shadow-lg group"
                title="Exit Career"
              >
                <span className="group-hover:scale-110 transition-transform">🏠</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Views */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          
          {activeTab === 'standings' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-3xl font-sport font-black uppercase italic tracking-tighter mb-6">League <span className="text-blue-500">Standings</span></h3>
              <StandingsTable standings={leagueState.standings} playerTeamId={playerTeam.id} />
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
               <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="text-3xl font-sport font-black uppercase italic tracking-tighter">{T.SKILLS} <span className="text-blue-500">{T.SKILL_TREE}</span></h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                      {T.SP}: <span className="text-yellow-400 text-xl">{skillTree.availablePoints}</span> 
                      <span className="mx-3 text-slate-600">|</span>
                      MAX SPENT: <span className={skillTree.totalPointsSpent >= 55 ? 'text-rose-500' : 'text-slate-400'}>{skillTree.totalPointsSpent}</span>/55
                    </p>
                  </div>
                  {hasTier4 && (
                    <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      {T.COST_INCREASED}
                    </div>
                  )}
               </div>

               <div className="flex-1 grid grid-cols-4 gap-4 pb-4">
                  {(['speed', 'shoot', 'control', 'defense'] as SkillBranch[]).map(branch => {
                    const currentLevel = skillTree.levels[branch];
                    return (
                      <div key={branch} className="bg-slate-950/30 rounded-3xl border border-white/5 p-4 flex flex-col items-center relative overflow-hidden">
                         <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                         <h4 className="font-sport font-black uppercase text-lg mb-2 text-slate-300">{getBranchLabel(branch)}</h4>
                         <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center mb-4 h-4">{getBranchDesc(branch)}</p>
                         
                         <div className="flex flex-col-reverse gap-4 w-full px-4 h-full justify-end">
                            {[1, 2, 3, 4, 5].map(level => {
                               const isUnlocked = currentLevel >= level;
                               const isNext = currentLevel === level - 1;
                               const cost = getSkillCost(level - 1);
                               const minMatches = Math.ceil(cost / 1.2); // approx 1.2 SP per win/bonus avg
                               const maxMatches = cost; // worst case, 1 SP per win (ignoring losses/draws for simplicity of "matches to win") or many draws
                               
                               const canAfford = skillTree.availablePoints >= cost;
                               const globalCapReached = skillTree.totalPointsSpent + cost > MAX_SKILL_POINTS_SPENT;
                               const isDisabled = !isNext || !canAfford || globalCapReached;

                               return (
                                 <div key={level} className="flex flex-col items-center group relative">
                                    {/* Connector Line */}
                                    {level > 1 && <div className={`w-1 h-4 ${currentLevel >= level ? 'bg-blue-500' : 'bg-slate-800'} mb-1`}></div>}
                                    
                                    <button 
                                      disabled={!isNext || isDisabled}
                                      onClick={() => handleUpgrade(branch, level)}
                                      className={`w-full h-14 rounded-xl border-2 flex items-center justify-center font-black text-sm relative transition-all overflow-hidden ${
                                        isUnlocked 
                                          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                                          : (isNext 
                                              ? (isDisabled 
                                                  ? 'bg-slate-900 border-slate-700 text-slate-600 cursor-not-allowed opacity-60' 
                                                  : 'bg-slate-800 border-white/20 text-white hover:bg-slate-700 hover:border-white/40 cursor-pointer shadow-lg')
                                              : 'bg-slate-950 border-slate-800 text-slate-700 opacity-40 cursor-not-allowed')
                                      }`}
                                    >
                                      {isUnlocked ? 'LVL ' + level : (
                                        isNext ? (globalCapReached ? T.MAX_REACHED : `${cost} ${T.SP}`) : '🔒'
                                      )}
                                    </button>

                                    {/* Tooltip for Next/Locked Nodes */}
                                    {!isUnlocked && isNext && (
                                      <div className="absolute bottom-full mb-2 w-48 bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                         <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{T.COST}: <span className="text-white">{cost} SP</span></div>
                                         <div className="text-[9px] font-bold text-slate-500 uppercase">{T.EST_MATCHES}: {minMatches}-{maxMatches}</div>
                                      </div>
                                    )}
                                 </div>
                               )
                            })}
                         </div>
                      </div>
                    )
                  })}
               </div>
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col gap-6">
                <h3 className="text-3xl font-sport font-black uppercase italic tracking-tighter">Career <span className="text-blue-500">Overview</span></h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                    <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Total Seasons</h4>
                    <div className="text-4xl font-sport font-black text-white">{careerHistory.length}</div>
                  </div>
                  <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5">
                    <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Trophies Won</h4>
                    <div className="text-4xl font-sport font-black text-yellow-500">{careerHistory.filter(h => h.wonTrophy).length}</div>
                  </div>
                </div>

                <div className="bg-slate-900/30 rounded-3xl p-6 border border-white/5">
                  <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">Achievements</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {achievements.map(ach => (
                     <div key={ach.id} title={ach.title + ": " + ach.description} className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border transition-all cursor-help ${ach.isUnlocked ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/20' : 'bg-slate-950/50 border-white/5 grayscale opacity-30'}`}>
                       {ach.icon}
                     </div>
                   ))}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                   <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">GEÇMİŞ SEZONLAR</h4>
                   <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {careerHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-600 italic font-bold">No history available yet.</div>
                      ) : (
                        <div className="space-y-2">
                           {careerHistory.slice().reverse().map((entry, idx) => {
                             const t = ALL_TEAMS.find(tm => tm.id === entry.teamId);
                             const league = LEAGUES.find(l => l.id === entry.leagueId);
                             const isExpanded = expandedSeason === entry.seasonNum;
                             const biggestWinTeam = entry.stats.biggestWin ? getTeamById(entry.stats.biggestWin.opponentId) : null;
                             const biggestLossTeam = entry.stats.biggestLoss ? getTeamById(entry.stats.biggestLoss.opponentId) : null;

                             return (
                               <div 
                                key={idx} 
                                onClick={() => setExpandedSeason(isExpanded ? null : entry.seasonNum)}
                                className={`bg-white/5 rounded-xl transition-all cursor-pointer hover:bg-white/10 ${isExpanded ? 'bg-slate-800/80 border border-blue-500/30' : 'border border-transparent'}`}
                               >
                                  <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                       <span className="text-xs font-black text-slate-500 w-8">S{entry.seasonNum}</span>
                                       <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black bg-slate-900 border border-white/10" style={{backgroundColor: t?.color, color: t?.secondaryColor}}>
                                            {t?.shortName}
                                          </div>
                                          <div>
                                            <div className="text-sm font-bold text-white">{t?.name || 'Unknown'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{league?.name}</div>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                       <div className="text-right">
                                         <div className="text-[10px] text-slate-500 font-black uppercase">Points</div>
                                         <div className="text-sm font-black font-sport">{entry.points}</div>
                                       </div>
                                       <div className="text-right w-24">
                                          <div className="text-[10px] text-slate-500 font-black uppercase">Result</div>
                                          <div className="text-sm font-bold">
                                            {entry.wonTrophy ? <span className="text-yellow-400 drop-shadow-sm">🏆 CHAMPION</span> : <span className="text-slate-300">Rank #{entry.rank}</span>}
                                          </div>
                                       </div>
                                       <div className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                      <div className="bg-slate-950/50 rounded-lg p-4 grid grid-cols-4 gap-4 border-t border-white/5">
                                        
                                        {/* Biggest Win */}
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center text-center">
                                          <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-2">Biggest Win</div>
                                          {biggestWinTeam ? (
                                            <>
                                              <div className="w-8 h-8 mb-1 rounded flex items-center justify-center text-[9px] font-black" style={{backgroundColor: biggestWinTeam.color, color: biggestWinTeam.secondaryColor}}>{biggestWinTeam.shortName}</div>
                                              <div className="text-lg font-sport font-black text-white">{entry.stats.biggestWin?.score}</div>
                                              <div className="text-[9px] text-slate-400 uppercase truncate w-full">{biggestWinTeam.name}</div>
                                            </>
                                          ) : (
                                            <div className="text-xs text-slate-500 italic py-2">None</div>
                                          )}
                                        </div>

                                        {/* Biggest Loss */}
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center text-center">
                                          <div className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-2">Biggest Loss</div>
                                          {biggestLossTeam ? (
                                            <>
                                              <div className="w-8 h-8 mb-1 rounded flex items-center justify-center text-[9px] font-black" style={{backgroundColor: biggestLossTeam.color, color: biggestLossTeam.secondaryColor}}>{biggestLossTeam.shortName}</div>
                                              <div className="text-lg font-sport font-black text-white">{entry.stats.biggestLoss?.score}</div>
                                              <div className="text-[9px] text-slate-400 uppercase truncate w-full">{biggestLossTeam.name}</div>
                                            </>
                                          ) : (
                                            <div className="text-xs text-slate-500 italic py-2">None</div>
                                          )}
                                        </div>

                                        {/* Goals */}
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
                                           <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2">Goals</div>
                                           <div className="flex gap-3 text-sm font-black">
                                              <div className="flex flex-col">
                                                <span className="text-emerald-400">{entry.stats.goalsFor}</span>
                                                <span className="text-[8px] text-slate-500 uppercase">GF</span>
                                              </div>
                                              <div className="text-slate-600">/</div>
                                              <div className="flex flex-col">
                                                <span className="text-rose-400">{entry.stats.goalsAgainst}</span>
                                                <span className="text-[8px] text-slate-500 uppercase">GA</span>
                                              </div>
                                           </div>
                                        </div>

                                        {/* Record */}
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
                                           <div className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-2">Record</div>
                                           <div className="text-xs font-bold text-slate-300">
                                             <span className="text-emerald-400">{entry.stats.wins}</span> W - <span className="text-amber-400">{entry.stats.draws}</span> D - <span className="text-rose-400">{entry.stats.losses}</span> L
                                           </div>
                                        </div>

                                      </div>
                                    </div>
                                  )}
                               </div>
                             );
                           })}
                        </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'settings' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-3xl font-sport font-black uppercase italic tracking-tighter mb-6">Manager <span className="text-blue-500">Settings</span></h3>
                
                <div className="bg-slate-950/40 p-8 rounded-3xl border border-white/5 space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manager Name</label>
                      <input 
                        type="text" 
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        maxLength={12}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="Enter Name..."
                      />
                      <p className="text-[10px] text-slate-600 italic">This name will appear on your manager profile card.</p>
                   </div>

                   <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                        <span>Difficulty</span>
                        <span className="text-white uppercase">{leagueState.difficulty}</span>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                        <span>Game Mode</span>
                        <div className="text-right">
                          <div className="text-white uppercase">{leagueState.isGoalieMode ? 'Goalie On' : 'Goalie Off'}</div>
                          {leagueState.isFireMode && <div className="text-orange-400 text-[10px] uppercase">Fire Mode Active</div>}
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
