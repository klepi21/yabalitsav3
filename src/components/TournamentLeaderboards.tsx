'use client';

import { TournamentPlayer, TournamentTeam } from '@/types/tournament';
import { cn } from '@/lib/utils';
import { Target, Handshake, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface TournamentLeaderboardsProps {
  players: TournamentPlayer[];
  teams: TournamentTeam[];
}

type LeaderboardTab = 'goals' | 'assists' | 'cards';

export default function TournamentLeaderboards({ players, teams }: TournamentLeaderboardsProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('goals');
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const topScorers = [...players]
    .filter((p) => p.stats.goals > 0)
    .sort((a, b) => b.stats.goals - a.stats.goals)
    .slice(0, 10);

  const topAssists = [...players]
    .filter((p) => p.stats.assists > 0)
    .sort((a, b) => b.stats.assists - a.stats.assists)
    .slice(0, 10);

  const topCards = [...players]
    .filter((p) => p.stats.yellowCards > 0 || p.stats.redCards > 0)
    .sort((a, b) => (b.stats.yellowCards + b.stats.redCards * 3) - (a.stats.yellowCards + a.stats.redCards * 3))
    .slice(0, 10);

  const tabs = [
    { id: 'goals' as const, label: 'Σκόρερ', icon: Target, data: topScorers },
    { id: 'assists' as const, label: 'Ασίστ', icon: Handshake, data: topAssists },
    { id: 'cards' as const, label: 'Κάρτες', icon: AlertTriangle, data: topCards },
  ];

  const activeData = tabs.find((t) => t.id === activeTab)?.data || [];

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-zinc-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-black uppercase tracking-wider transition-all",
                activeTab === tab.id
                  ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeData.length === 0 ? (
          <p className="text-center text-sm text-zinc-300 py-8 font-bold">Δεν υπάρχουν δεδομένα</p>
        ) : (
          <div className="space-y-1">
            {activeData.map((player, idx) => {
              const team = teamMap.get(player.teamId);
              const isTop3 = idx < 3;
              return (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl transition-all",
                    isTop3 ? "bg-zinc-50" : "hover:bg-zinc-50/50"
                  )}
                >
                  {/* Position */}
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-zinc-200 text-zinc-600" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-transparent text-zinc-400"
                  )}>
                    {idx + 1}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">{player.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{team?.name || '—'}</p>
                  </div>

                  {/* Shirt number */}
                  {player.shirtNumber && (
                    <span className="text-[11px] font-bold text-zinc-300">#{player.shirtNumber}</span>
                  )}

                  {/* Stat value */}
                  {activeTab === 'goals' && (
                    <div className="text-right">
                      <span className="text-sm font-black text-zinc-900">{player.stats.goals}</span>
                      <span className="text-[8px] font-bold text-zinc-300 ml-0.5">γκολ</span>
                    </div>
                  )}
                  {activeTab === 'assists' && (
                    <div className="text-right">
                      <span className="text-sm font-black text-zinc-900">{player.stats.assists}</span>
                      <span className="text-[8px] font-bold text-zinc-300 ml-0.5">ασίστ</span>
                    </div>
                  )}
                  {activeTab === 'cards' && (
                    <div className="flex items-center gap-1.5">
                      {player.stats.yellowCards > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="h-3.5 w-2.5 rounded-sm bg-amber-400" />
                          <span className="text-xs font-black text-zinc-700">{player.stats.yellowCards}</span>
                        </div>
                      )}
                      {player.stats.redCards > 0 && (
                        <div className="flex items-center gap-0.5">
                          <div className="h-3.5 w-2.5 rounded-sm bg-red-500" />
                          <span className="text-xs font-black text-zinc-700">{player.stats.redCards}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
