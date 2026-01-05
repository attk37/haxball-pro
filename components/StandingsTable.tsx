
import React from 'react';
import { Standing, FormResult } from '../types';
import { ALL_TEAMS } from '../constants';

interface StandingsTableProps {
  standings: Standing[];
  playerTeamId: string;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ standings, playerTeamId }) => {
  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
    return b.goalsFor - a.goalsFor;
  });

  const getTeam = (id: string) => ALL_TEAMS.find(t => t.id === id)!;

  const FormBox: React.FC<{ entry: FormResult | null }> = ({ entry }) => {
    if (!entry) {
      return (
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-slate-700 bg-slate-900/50 border border-white/5 shadow-inner">
          -
        </div>
      );
    }

    const opponent = getTeam(entry.opponentId);
    const tooltipText = `${opponent.name} (${entry.homeScore}-${entry.awayScore})`;
    
    let bgColor = 'bg-slate-700';
    if (entry.result === 'G') bgColor = 'bg-emerald-500';
    else if (entry.result === 'B') bgColor = 'bg-amber-500';
    else if (entry.result === 'M') bgColor = 'bg-rose-500';

    return (
      <div 
        title={tooltipText}
        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-transform hover:scale-110 cursor-help ${bgColor}`}
      >
        {entry.result}
      </div>
    );
  };

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
          <th className="pb-4 px-4 font-normal">#</th>
          <th className="pb-4 px-4 font-normal">Club Name</th>
          <th className="pb-4 px-4 text-center font-normal">PL</th>
          <th className="pb-4 px-4 text-center font-normal">G</th>
          <th className="pb-4 px-4 text-center font-normal">B</th>
          <th className="pb-4 px-4 text-center font-normal">M</th>
          <th className="pb-4 px-4 text-center font-normal">GF</th>
          <th className="pb-4 px-4 text-center font-normal">GA</th>
          <th className="pb-4 px-4 text-center font-normal">GD</th>
          <th className="pb-4 px-4 text-center font-normal text-white">Pts</th>
          <th className="pb-4 px-4 text-center font-normal">Form</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/[0.02]">
        {sorted.map((s, idx) => {
          const team = getTeam(s.teamId);
          const isPlayer = s.teamId === playerTeamId;
          const gd = s.goalsFor - s.goalsAgainst;
          
          // Show last 5 matches, most recent on the right
          const displayForm = Array(5).fill(null);
          // s.form[0] is most recent. We want it at index 4.
          // s.form[1] at index 3, etc.
          for (let i = 0; i < s.form.length && i < 5; i++) {
            displayForm[4 - i] = s.form[i];
          }
          
          return (
            <tr key={s.teamId} className={`group transition-all ${isPlayer ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'}`}>
              <td className="py-4 px-4">
                <span className={`text-xs font-sport font-bold ${idx < 1 ? 'text-yellow-400' : (idx < 4 ? 'text-blue-400' : (idx > sorted.length - 5 ? 'text-red-500' : 'text-slate-600'))}`}>
                  {(idx + 1).toString().padStart(2, '0')}
                </span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-sport font-black shadow-lg border border-white/5" style={{ backgroundColor: team.color, color: team.secondaryColor }}>
                    {team.shortName}
                  </div>
                  <span className={`text-sm font-bold tracking-tight uppercase ${isPlayer ? 'text-blue-400' : 'text-slate-200'}`}>{team.name}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-500">{s.played}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{s.won}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{s.drawn}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{s.lost}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{s.goalsFor}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-400">{s.goalsAgainst}</td>
              <td className="py-4 px-4 text-center text-xs font-bold text-slate-500">{gd > 0 ? `+${gd}` : gd}</td>
              <td className="py-4 px-4 text-center text-sm font-sport font-black text-white">{s.points}</td>
              <td className="py-4 px-4">
                <div className="flex justify-center gap-1.5">
                  {displayForm.map((entry, i) => (
                    <FormBox key={i} entry={entry} />
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default StandingsTable;
