export type TournamentGroup = 'A' | 'B';
export type TournamentPhase = 'GROUP' | 'QF' | 'SF' | 'THIRD' | 'FINAL';

export interface Tournament4v4Team {
  id: string;
  name: string;
  group: TournamentGroup | null;
  drawOrder: number | null;
  tournamentId: string;
  createdAt: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  phase: TournamentPhase;
  group: TournamentGroup | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Tournament4v4Team;
  awayTeam: Tournament4v4Team;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  teams: Tournament4v4Team[];
  matches: TournamentMatch[];
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  group: TournamentGroup;
  played: number;
  wins: number;
  pf: number;
  pc: number;
  total: number;
}

export type TournamentStandings = { A: StandingRow[]; B: StandingRow[] };

export type BackupTrigger = 'draw' | 'undo_draw' | 'match_update' | 'knockout' | 'manual' | 'restore';

export interface TournamentBackup {
  filename: string;
  trigger: BackupTrigger;
  triggerDetail: string;
  createdAt: string;
  sizeBytes: number;
}
