'use client';

import { TournamentMatch, TournamentTeam } from '@/types/tournament';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface KnockoutBracketProps {
  matches: TournamentMatch[];
  teams: TournamentTeam[];
}

interface BracketMatch {
  match: TournamentMatch | null;
  homeTeam: TournamentTeam | null;
  awayTeam: TournamentTeam | null;
}

export default function KnockoutBracket({ matches, teams }: KnockoutBracketProps) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Group matches by round
  const roundsMap = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
    roundsMap.get(m.round)!.push(m);
  }

  const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
  if (rounds.length === 0) return null;

  // Build bracket data per round
  const bracketRounds: { label: string; matches: BracketMatch[] }[] = rounds.map((round) => {
    const roundMatches = roundsMap.get(round)!;
    const label = roundMatches[0]?.roundLabel || `Round ${round}`;
    return {
      label,
      matches: roundMatches.map((m) => ({
        match: m,
        homeTeam: teamMap.get(m.homeTeamId) || null,
        awayTeam: teamMap.get(m.awayTeamId) || null,
      })),
    };
  });

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-stretch gap-0 min-w-fit">
        {bracketRounds.map((round, roundIdx) => {
          const isLast = roundIdx === bracketRounds.length - 1;
          return (
            <div key={roundIdx} className="flex flex-col items-center">
              {/* Round label */}
              <div className="mb-4 px-4">
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border",
                  isLast ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                )}>
                  {isLast && <Trophy className="h-3 w-3 inline mr-1 -mt-0.5" />}
                  {round.label}
                </span>
              </div>

              {/* Matches in this round */}
              <div className="flex flex-col justify-around flex-1 gap-4 px-2" style={{ minWidth: 220 }}>
                {round.matches.map((bm, matchIdx) => {
                  const { match, homeTeam, awayTeam } = bm;
                  const isCompleted = match?.status === 'completed';
                  const homeWon = isCompleted && (match?.homeScore ?? 0) > (match?.awayScore ?? 0);
                  const awayWon = isCompleted && (match?.awayScore ?? 0) > (match?.homeScore ?? 0);
                  const hasPenalties = match?.penalties;

                  return (
                    <div key={matchIdx} className="relative">
                      {/* Match card */}
                      <div className={cn(
                        "rounded-xl border overflow-hidden transition-all",
                        isCompleted ? "border-zinc-200 bg-white shadow-sm" : "border-zinc-100 bg-zinc-50/50"
                      )}>
                        {/* Home team */}
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2.5 border-b border-zinc-100",
                          homeWon && "bg-emerald-50/50"
                        )}>
                          <div className="h-6 w-6 rounded-md bg-zinc-100 flex items-center justify-center text-[11px] font-black text-zinc-400 shrink-0">
                            {homeTeam?.name.charAt(0) || '?'}
                          </div>
                          <span className={cn(
                            "text-xs font-bold flex-1 truncate",
                            homeWon ? "text-emerald-700" : homeTeam ? "text-zinc-700" : "text-zinc-300 italic"
                          )}>
                            {homeTeam?.name || 'TBD'}
                          </span>
                          {match && match.status !== 'scheduled' && (
                            <span className={cn(
                              "text-sm font-black min-w-[20px] text-center",
                              homeWon ? "text-emerald-600" : "text-zinc-400"
                            )}>
                              {match.homeScore ?? '-'}
                            </span>
                          )}
                        </div>

                        {/* Away team */}
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2.5",
                          awayWon && "bg-emerald-50/50"
                        )}>
                          <div className="h-6 w-6 rounded-md bg-zinc-100 flex items-center justify-center text-[11px] font-black text-zinc-400 shrink-0">
                            {awayTeam?.name.charAt(0) || '?'}
                          </div>
                          <span className={cn(
                            "text-xs font-bold flex-1 truncate",
                            awayWon ? "text-emerald-700" : awayTeam ? "text-zinc-700" : "text-zinc-300 italic"
                          )}>
                            {awayTeam?.name || 'TBD'}
                          </span>
                          {match && match.status !== 'scheduled' && (
                            <span className={cn(
                              "text-sm font-black min-w-[20px] text-center",
                              awayWon ? "text-emerald-600" : "text-zinc-400"
                            )}>
                              {match.awayScore ?? '-'}
                            </span>
                          )}
                        </div>

                        {/* Penalties */}
                        {hasPenalties && (
                          <div className="text-center py-1 bg-amber-50 border-t border-amber-100">
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider">
                              PEN {match.penalties!.home} - {match.penalties!.away}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Match info */}
                      {match && (
                        <div className="text-center mt-1.5">
                          {match.status === 'scheduled' && match.scheduledDate && (
                            <p className="text-[8px] font-bold text-zinc-300">
                              {new Date(match.scheduledDate instanceof Date ? match.scheduledDate : match.scheduledDate).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })}
                              {match.scheduledTime && ` ${match.scheduledTime}`}
                            </p>
                          )}
                          {match.status === 'live' && (
                            <span className="text-[8px] font-black text-red-500 uppercase animate-pulse">LIVE</span>
                          )}
                        </div>
                      )}

                      {/* Connector lines to next round */}
                      {!isLast && (
                        <div className="absolute top-1/2 -right-2 w-2 h-px bg-zinc-200" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
