
import React from 'react';
import { LeagueState, Match } from '../types';
import { ALL_TEAMS, LEAGUES } from '../constants';
import StandingsTable from './StandingsTable';

interface DashboardProps {
  leagueState: LeagueState;
  onPlayNext: () => void;
  onSimWeek: () => void;
  onAdvance: () => void;
  onExit?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ leagueState, onPlayNext, onSimWeek, onAdvance, onExit }) => {
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
               <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-2">Season Campaign Active</p>
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
                <div className="flex flex-col items-center">
                  {playerMatch.isCompleted ? (
                    <div className="text-3xl font-sport font-black italic text-blue-400 flex gap-3">
                      <span>{playerMatch.homeScore}</span>
                      <span className="text-slate-700">-</span>
                      <span>{playerMatch.awayScore}</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-sport font-black italic text-slate-700">VS</div>
                  )}
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

      {/* Standings Content */}
      <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-[3rem] backdrop-blur-3xl overflow-hidden flex flex-col p-10 relative">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-3xl font-sport font-black uppercase italic tracking-tighter">League <span className="text-blue-500">Standings</span></h3>
          <div className="flex items-center gap-4">
            {onExit && (
              <button 
                onClick={onExit}
                className="w-12 h-12 rounded-2xl bg-slate-800/80 hover:bg-blue-600 transition-all border border-white/10 flex items-center justify-center text-xl shadow-lg group"
                title="Return to Menu"
              >
                <span className="group-hover:scale-110 transition-transform">🏠</span>
              </button>
            )}
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500/20"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <StandingsTable standings={leagueState.standings} playerTeamId={playerTeam.id} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
