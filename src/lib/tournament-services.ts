import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Tournament,
  TournamentTeam,
  TournamentPlayer,
  TournamentMatch,
  MatchEvent,
  emptyTeamStats,
  emptyPlayerStats,
} from '../types/tournament';

// ─── Helpers ──────────────────────────────────────────

function convertDoc<T>(id: string, data: Record<string, unknown>, dateFields: string[] = ['createdAt', 'updatedAt']): T {
  const { id: _id, ...rest } = data;
  const converted: Record<string, unknown> = { id, ...rest };
  for (const field of dateFields) {
    const val = converted[field] as { toDate?: () => Date } | undefined;
    converted[field] = val?.toDate?.() || new Date();
  }
  return converted as T;
}

// ─── Tournament Service ───────────────────────────────

export const tournamentService = {
  async create(data: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_tournaments'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(id: string): Promise<Tournament | null> {
    const docRef = doc(db, 'yabalitsa_tournaments', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertDoc<Tournament>(docSnap.id, docSnap.data(), ['createdAt', 'updatedAt', 'startDate', 'endDate']);
  },

  async getByVenue(venueId: string): Promise<Tournament[]> {
    const q = query(collection(db, 'yabalitsa_tournaments'), where('venueId', '==', venueId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertDoc<Tournament>(d.id, d.data(), ['createdAt', 'updatedAt', 'startDate', 'endDate']));
  },

  async update(id: string, data: Partial<Tournament>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournaments', id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournaments', id);
    await deleteDoc(docRef);
  },
};

// ─── Tournament Team Service ──────────────────────────

export const tournamentTeamService = {
  async create(data: Omit<TournamentTeam, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_tournament_teams'), {
      ...data,
      stats: data.stats || emptyTeamStats,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(id: string): Promise<TournamentTeam | null> {
    const docRef = doc(db, 'yabalitsa_tournament_teams', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertDoc<TournamentTeam>(docSnap.id, docSnap.data());
  },

  async getByTournament(tournamentId: string): Promise<TournamentTeam[]> {
    const q = query(collection(db, 'yabalitsa_tournament_teams'), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertDoc<TournamentTeam>(d.id, d.data()));
  },

  async update(id: string, data: Partial<TournamentTeam>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_teams', id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_teams', id);
    await deleteDoc(docRef);
  },
};

// ─── Tournament Player Service ────────────────────────

export const tournamentPlayerService = {
  async create(data: Omit<TournamentPlayer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_tournament_players'), {
      ...data,
      stats: data.stats || emptyPlayerStats,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(id: string): Promise<TournamentPlayer | null> {
    const docRef = doc(db, 'yabalitsa_tournament_players', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertDoc<TournamentPlayer>(docSnap.id, docSnap.data());
  },

  async getByTeam(teamId: string): Promise<TournamentPlayer[]> {
    const q = query(collection(db, 'yabalitsa_tournament_players'), where('teamId', '==', teamId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertDoc<TournamentPlayer>(d.id, d.data()));
  },

  async getByTournament(tournamentId: string): Promise<TournamentPlayer[]> {
    const q = query(collection(db, 'yabalitsa_tournament_players'), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertDoc<TournamentPlayer>(d.id, d.data()));
  },

  async update(id: string, data: Partial<TournamentPlayer>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_players', id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_players', id);
    await deleteDoc(docRef);
  },
};

// ─── Tournament Match Service ─────────────────────────

export const tournamentMatchService = {
  async create(data: Omit<TournamentMatch, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'yabalitsa_tournament_matches'), {
      ...data,
      events: data.events || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getById(id: string): Promise<TournamentMatch | null> {
    const docRef = doc(db, 'yabalitsa_tournament_matches', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertDoc<TournamentMatch>(docSnap.id, docSnap.data(), ['createdAt', 'updatedAt', 'scheduledDate']);
  },

  async getByTournament(tournamentId: string): Promise<TournamentMatch[]> {
    const q = query(collection(db, 'yabalitsa_tournament_matches'), where('tournamentId', '==', tournamentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertDoc<TournamentMatch>(d.id, d.data(), ['createdAt', 'updatedAt', 'scheduledDate']));
  },

  async update(id: string, data: Partial<TournamentMatch>): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_matches', id);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, 'yabalitsa_tournament_matches', id);
    await deleteDoc(docRef);
  },
};

// ─── Fixture Generation ───────────────────────────────

export function generateLeagueFixtures(
  teamIds: string[],
  legs: number = 1
): { round: number; homeTeamId: string; awayTeamId: string }[] {
  const teams = [...teamIds];
  // If odd number of teams, add a "bye" placeholder
  if (teams.length % 2 !== 0) teams.push('__BYE__');

  const n = teams.length;
  const rounds: { round: number; homeTeamId: string; awayTeamId: string }[] = [];
  let roundNum = 1;

  for (let leg = 0; leg < legs; leg++) {
    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) {
        const home = teams[i];
        const away = teams[n - 1 - i];
        if (home === '__BYE__' || away === '__BYE__') continue;

        if (leg === 0) {
          rounds.push({ round: roundNum, homeTeamId: home, awayTeamId: away });
        } else {
          // Reverse home/away for second leg
          rounds.push({ round: roundNum, homeTeamId: away, awayTeamId: home });
        }
      }
      roundNum++;

      // Rotate teams (keep first team fixed)
      const last = teams.pop()!;
      teams.splice(1, 0, last);
    }
  }

  return rounds;
}

export function generateKnockoutBracket(
  teamIds: string[]
): { round: number; homeTeamId: string; awayTeamId: string; roundLabel: string }[] {
  // Pad to next power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(teamIds.length)));
  const seeded = [...teamIds];
  while (seeded.length < size) seeded.push('__BYE__');

  const matches: { round: number; homeTeamId: string; awayTeamId: string; roundLabel: string }[] = [];
  const totalRounds = Math.log2(size);

  const roundLabels: Record<number, string> = {
    1: 'Τελικός',
    2: 'Ημιτελικός',
    4: 'Προημιτελικός',
  };

  // First round pairings (1v8, 2v7, etc.)
  for (let i = 0; i < size / 2; i++) {
    const home = seeded[i];
    const away = seeded[size - 1 - i];
    if (home === '__BYE__' || away === '__BYE__') continue;

    const remaining = size / 2;
    const label = roundLabels[remaining] || `Γύρος ${totalRounds}`;

    matches.push({ round: 1, homeTeamId: home, awayTeamId: away, roundLabel: label });
  }

  return matches;
}

// ─── Standings Recalculation ──────────────────────────

export async function recalculateStandings(tournamentId: string): Promise<void> {
  const [teams, matches] = await Promise.all([
    tournamentTeamService.getByTournament(tournamentId),
    tournamentMatchService.getByTournament(tournamentId),
  ]);

  const completedMatches = matches.filter(m => m.status === 'completed');

  const statsMap = new Map<string, TournamentTeam['stats']>();
  for (const team of teams) {
    statsMap.set(team.id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  }

  for (const match of completedMatches) {
    const homeStats = statsMap.get(match.homeTeamId);
    const awayStats = statsMap.get(match.awayTeamId);
    if (!homeStats || !awayStats) continue;

    const hs = match.homeScore ?? 0;
    const as = match.awayScore ?? 0;

    homeStats.played++;
    awayStats.played++;
    homeStats.goalsFor += hs;
    homeStats.goalsAgainst += as;
    awayStats.goalsFor += as;
    awayStats.goalsAgainst += hs;

    if (hs > as) {
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
    } else if (hs < as) {
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      awayStats.drawn++;
      homeStats.points += 1;
      awayStats.points += 1;
    }
  }

  const batch = writeBatch(db);
  for (const team of teams) {
    const stats = statsMap.get(team.id);
    if (stats) {
      const docRef = doc(db, 'yabalitsa_tournament_teams', team.id);
      batch.update(docRef, { stats, updatedAt: serverTimestamp() });
    }
  }
  await batch.commit();
}

// ─── Player Stats Recalculation ───────────────────────

export async function recalculatePlayerStats(tournamentId: string): Promise<void> {
  const [players, matches] = await Promise.all([
    tournamentPlayerService.getByTournament(tournamentId),
    tournamentMatchService.getByTournament(tournamentId),
  ]);

  const completedMatches = matches.filter(m => m.status === 'completed');

  const statsMap = new Map<string, TournamentPlayer['stats']>();
  for (const player of players) {
    statsMap.set(player.id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0 });
  }

  for (const match of completedMatches) {
    for (const event of (match.events || [])) {
      const ps = statsMap.get(event.playerId);
      if (ps) {
        if (event.type === 'goal' || event.type === 'penalty_scored') ps.goals++;
        if (event.type === 'yellow_card') ps.yellowCards++;
        if (event.type === 'red_card') ps.redCards++;
      }
      if (event.assistPlayerId) {
        const as = statsMap.get(event.assistPlayerId);
        if (as) as.assists++;
      }
    }
  }

  const batch = writeBatch(db);
  for (const player of players) {
    const stats = statsMap.get(player.id);
    if (stats) {
      const docRef = doc(db, 'yabalitsa_tournament_players', player.id);
      batch.update(docRef, { stats, updatedAt: serverTimestamp() });
    }
  }
  await batch.commit();
}

// ─── BlockedDate Sync ─────────────────────────────────

export { type MatchEvent };
