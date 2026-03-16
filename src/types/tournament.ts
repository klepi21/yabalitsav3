export interface Tournament {
  id: string;
  venueId: string;
  name: string;
  description?: string;
  type: 'league' | 'knockout' | 'group+knockout';
  pitchType: '5x5' | '6x6' | '7x7' | '8x8' | '9x9';
  pitchId?: string;
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  maxTeams: number;
  matchDuration: number;
  legs: number; // 1 or 2 for league
  rules?: string;
  prizeDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  venueId: string;
  name: string;
  logoUrl?: string;
  captainName: string;
  captainPhone: string;
  captainEmail?: string;
  status: 'registered' | 'confirmed' | 'eliminated' | 'withdrawn';
  groupLabel?: string;
  stats: TeamStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface TournamentPlayer {
  id: string;
  teamId: string;
  tournamentId: string;
  venueId: string;
  name: string;
  phone?: string;
  email?: string;
  shirtNumber?: number;
  position?: 'GK' | 'DEF' | 'MID' | 'FWD';
  stats: PlayerStats;
  isCaptain: boolean;
  customerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'own_goal' | 'penalty_scored' | 'penalty_missed';
  playerId: string;
  teamId: string;
  assistPlayerId?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  venueId: string;
  pitchId?: string;
  round: number;
  roundLabel?: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledDate: Date;
  scheduledTime: string; // HH:mm
  status: 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  penalties?: { home: number; away: number };
  blockedDateId?: string;
  bookingId?: string;
  events: MatchEvent[];
  createdAt: Date;
  updatedAt: Date;
}

// Default stats for new teams/players
export const emptyTeamStats: TeamStats = {
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  points: 0,
};

export const emptyPlayerStats: PlayerStats = {
  goals: 0,
  assists: 0,
  yellowCards: 0,
  redCards: 0,
};
