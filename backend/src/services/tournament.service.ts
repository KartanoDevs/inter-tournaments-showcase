import { TournamentGroup, TournamentPhase } from '@prisma/client';
import { TournamentRepository } from '../repositories/tournament.repository';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { TournamentBackupService, TournamentSnapshot, BackupTrigger } from './tournament-backup.service';

export interface StandingRow {
  teamId: string;
  teamName: string;
  group: TournamentGroup;
  played: number;
  wins: number;
  pf: number; // puntos a favor
  pc: number; // puntos en contra
  total: number; // diferencial
}

export class TournamentService {
  constructor(
    private repo: TournamentRepository,
    private backupService: TournamentBackupService
  ) {}

  private snap(fullTournament: any, trigger: BackupTrigger, detail = '') {
    try {
      this.backupService.createSnapshot(fullTournament, fullTournament.id, trigger, detail);
    } catch (err) {
      console.error('[backup]', err);
    }
  }

  async getAll() {
    return this.repo.findAllActive();
  }

  async getById(id: string) {
    const tournament = await this.repo.findById(id);
    if (!tournament) throw new NotFoundError('Torneo no encontrado');
    return tournament;
  }

  async create(data: { name: string; date?: string | null }) {
    return this.repo.create({
      name: data.name,
      date: data.date ? new Date(data.date) : null
    });
  }

  async update(id: string, data: { name?: string; date?: string | null; isActive?: boolean }) {
    await this.getById(id);
    return this.repo.update(id, {
      ...data,
      date: data.date !== undefined ? (data.date ? new Date(data.date) : null) : undefined
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.repo.softDelete(id);
  }

  async addTeam(tournamentId: string, name: string) {
    await this.getById(tournamentId);
    const hasDrawn = await this.repo.hasDrawn(tournamentId);
    if (hasDrawn) throw new ConflictError('No se pueden añadir equipos después del sorteo');
    return this.repo.addTeam(tournamentId, name.trim());
  }

  async removeTeam(tournamentId: string, teamId: string) {
    const hasDrawn = await this.repo.hasDrawn(tournamentId);
    if (hasDrawn) throw new ConflictError('No se pueden eliminar equipos después del sorteo');
    const team = await this.repo.findTeam(teamId);
    if (!team || team.tournamentId !== tournamentId) throw new NotFoundError('Equipo no encontrado');
    return this.repo.deleteTeam(teamId);
  }

  async draw(tournamentId: string) {
    await this.getById(tournamentId);

    const hasPlayed = await this.repo.hasPlayedMatches(tournamentId);
    if (hasPlayed) throw new ConflictError('No se puede re-sortear: ya hay partidos jugados');

    const teams = await this.repo.findTeamsByTournament(tournamentId);
    if (teams.length < 4) throw new ValidationError('Se necesitan al menos 4 equipos para sortear');

    // Fisher-Yates shuffle
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Mitad a cada grupo; si es impar, Grupo A recibe el extra
    const halfB = Math.floor(shuffled.length / 2);
    const halfA = shuffled.length - halfB;

    const assignments = shuffled.map((team, idx) => ({
      id: team.id,
      group: (idx < halfA ? TournamentGroup.A : TournamentGroup.B) as TournamentGroup,
      drawOrder: idx < halfA ? idx + 1 : idx - halfA + 1
    }));

    // Limpiar partidos previos (re-sorteo)
    await this.repo.deleteMatchesByTournament(tournamentId);
    await this.repo.assignGroupsAndOrders(assignments);

    // Generar partidos round-robin por grupo
    const groupA = assignments.filter(a => a.group === TournamentGroup.A);
    const groupB = assignments.filter(a => a.group === TournamentGroup.B);

    const matchesA = this.generateRoundRobinMatches(tournamentId, TournamentGroup.A, groupA.map(a => a.id));
    const matchesB = this.generateRoundRobinMatches(tournamentId, TournamentGroup.B, groupB.map(a => a.id));

    await this.repo.createMatches([...matchesA, ...matchesB]);

    const result = await this.repo.findById(tournamentId);
    this.snap(result, 'draw', 'Sorteo generado');
    return result;
  }

  async undoDraw(tournamentId: string) {
    const hasPlayed = await this.repo.hasPlayedMatches(tournamentId);
    if (hasPlayed) throw new ConflictError('No se puede deshacer el sorteo: ya hay partidos jugados');

    await this.repo.deleteMatchesByTournament(tournamentId);
    await this.repo.resetGroupAssignments(tournamentId);

    const result = await this.repo.findById(tournamentId);
    this.snap(result, 'undo_draw', 'Sorteo deshecho');
    return result;
  }

  async updateMatch(
    tournamentId: string,
    matchId: string,
    data: { homeScore?: number | null; awayScore?: number | null; played?: boolean }
  ) {
    const match = await this.repo.findMatch(matchId);
    if (!match || match.tournamentId !== tournamentId) throw new NotFoundError('Partido no encontrado');

    const updateData = { ...data };
    const homeScore = data.homeScore !== undefined ? data.homeScore : match.homeScore;
    const awayScore = data.awayScore !== undefined ? data.awayScore : match.awayScore;
    updateData.played = typeof homeScore === 'number' && typeof awayScore === 'number';

    const updated = await this.repo.updateMatch(matchId, updateData);

    if (updated.played && updated.phase !== TournamentPhase.GROUP) {
      await this.advanceKnockout(tournamentId);
    }

    const full = await this.repo.findById(tournamentId);
    const home = updated.homeTeam?.name ?? updated.homeTeamId;
    const away = updated.awayTeam?.name ?? updated.awayTeamId;
    const detail = `${home} ${updated.homeScore ?? '?'}-${updated.awayScore ?? '?'} ${away}`;
    this.snap(full, 'match_update', detail);

    return updated;
  }

  async getStandings(tournamentId: string): Promise<Record<TournamentGroup, StandingRow[]>> {
    const matches = await this.repo.findMatchesByTournament(tournamentId);
    const teams = await this.repo.findTeamsByTournament(tournamentId);

    const stats: Record<string, StandingRow> = {};

    for (const team of teams) {
      if (!team.group) continue;
      stats[team.id] = {
        teamId: team.id,
        teamName: team.name,
        group: team.group,
        played: 0,
        wins: 0,
        pf: 0,
        pc: 0,
        total: 0
      };
    }

    for (const m of matches) {
      if (m.phase !== TournamentPhase.GROUP) continue;
      if (!m.played || m.homeScore === null || m.awayScore === null) continue;
      if (stats[m.homeTeamId]) {
        stats[m.homeTeamId].played++;
        stats[m.homeTeamId].pf += m.homeScore;
        stats[m.homeTeamId].pc += m.awayScore;
        if (m.homeScore > m.awayScore) stats[m.homeTeamId].wins++;
      }
      if (stats[m.awayTeamId]) {
        stats[m.awayTeamId].played++;
        stats[m.awayTeamId].pf += m.awayScore;
        stats[m.awayTeamId].pc += m.homeScore;
        if (m.awayScore > m.homeScore) stats[m.awayTeamId].wins++;
      }
    }

    for (const row of Object.values(stats)) {
      row.total = row.pf - row.pc;
    }

    const sortFn = (a: StandingRow, b: StandingRow) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.total !== a.total) return b.total - a.total;
      // Empate exacto: orden estable por nombre
      return a.teamName.localeCompare(b.teamName);
    };

    const groupARows = Object.values(stats).filter(r => r.group === TournamentGroup.A).sort(sortFn);
    const groupBRows = Object.values(stats).filter(r => r.group === TournamentGroup.B).sort(sortFn);

    return { A: groupARows, B: groupBRows };
  }

  async generateKnockout(tournamentId: string) {
    const hasDrawn = await this.repo.hasDrawn(tournamentId);
    if (!hasDrawn) throw new ConflictError('El torneo aún no ha sido sorteado');

    const allPlayed = await this.repo.hasAllGroupMatchesPlayed(tournamentId);
    if (!allPlayed) throw new ConflictError('Aún hay partidos de liga sin jugar');

    const alreadyExists = await this.repo.hasKnockoutMatches(tournamentId);
    if (alreadyExists) throw new ConflictError('La fase eliminatoria ya ha sido generada');

    const teams = await this.repo.findTeamsByTournament(tournamentId);
    const totalTeams = teams.length;

    if (totalTeams !== 8 && totalTeams !== 10) {
      throw new ValidationError('La fase eliminatoria solo está soportada para torneos de 8 o 10 equipos');
    }

    const standings = await this.getStandings(tournamentId);
    const a = standings.A.slice(0, 4);
    const b = standings.B.slice(0, 4);

    if (a.length < 4 || b.length < 4) {
      throw new ConflictError('No hay suficientes equipos clasificados en cada grupo');
    }

    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));

    const qfMatches = [
      { homeTeamId: a[0].teamId, awayTeamId: b[3].teamId },
      { homeTeamId: a[1].teamId, awayTeamId: b[2].teamId },
      { homeTeamId: b[0].teamId, awayTeamId: a[3].teamId },
      { homeTeamId: b[1].teamId, awayTeamId: a[2].teamId },
    ].map(m => ({
      tournamentId,
      phase: TournamentPhase.QF,
      group: null as TournamentGroup | null,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));

    await this.repo.createMatches(qfMatches);

    const result = await this.repo.findById(tournamentId);
    this.snap(result, 'knockout', 'Fase eliminatoria generada');
    return result;
  }

  async createManualBackup(tournamentId: string) {
    const full = await this.getById(tournamentId);
    this.backupService.createSnapshot(full, tournamentId, 'manual', 'Snapshot manual');
    return this.backupService.listSnapshots(tournamentId)[0];
  }

  async restore(tournamentId: string, snapshot: TournamentSnapshot) {
    if (snapshot.tournament.id !== tournamentId) {
      throw new ValidationError('El snapshot no pertenece a este torneo');
    }
    const restored = await this.repo.restoreFromSnapshot(tournamentId, snapshot);
    const detail = `Restaurado: ${snapshot.trigger} ${snapshot.createdAt}`;
    this.snap(restored, 'restore', detail);
    return restored;
  }

  async advanceKnockout(tournamentId: string) {
    const qfs = await this.repo.findMatchesByPhase(tournamentId, TournamentPhase.QF);
    const sfs = await this.repo.findMatchesByPhase(tournamentId, TournamentPhase.SF);
    const thirds = await this.repo.findMatchesByPhase(tournamentId, TournamentPhase.THIRD);
    const finals = await this.repo.findMatchesByPhase(tournamentId, TournamentPhase.FINAL);

    const allPlayed = (matches: typeof qfs) => matches.length > 0 && matches.every(m => m.played);
    const winner = (m: (typeof qfs)[0]) => m.homeScore! > m.awayScore! ? m.homeTeamId : m.awayTeamId;
    const loser = (m: (typeof qfs)[0]) => m.homeScore! > m.awayScore! ? m.awayTeamId : m.homeTeamId;

    if (allPlayed(qfs) && sfs.length === 0) {
      await this.repo.createMatches([
        { tournamentId, phase: TournamentPhase.SF, group: null, homeTeamId: winner(qfs[0]), awayTeamId: winner(qfs[1]) },
        { tournamentId, phase: TournamentPhase.SF, group: null, homeTeamId: winner(qfs[2]), awayTeamId: winner(qfs[3]) },
      ]);
    }

    if (allPlayed(sfs) && thirds.length === 0) {
      await this.repo.createMatches([
        { tournamentId, phase: TournamentPhase.THIRD, group: null, homeTeamId: loser(sfs[0]), awayTeamId: loser(sfs[1]) },
        { tournamentId, phase: TournamentPhase.FINAL, group: null, homeTeamId: winner(sfs[0]), awayTeamId: winner(sfs[1]) },
      ]);
    }
  }

  private generateRoundRobinMatches(
    tournamentId: string,
    group: TournamentGroup,
    teamIds: string[]
  ) {
    const matches: { tournamentId: string; group: TournamentGroup; homeTeamId: string; awayTeamId: string }[] = [];
    const n = teamIds.length;
    if (n < 2) return matches;

    // Circle method: fix first element, rotate the rest.
    // Odd number of teams → add a null bye to make it even.
    const players: (string | null)[] = n % 2 === 0 ? [...teamIds] : [...teamIds, null];
    const m = players.length;
    const half = m / 2;
    const rotating = players.slice(1);

    for (let r = 0; r < m - 1; r++) {
      const roundPlayers: (string | null)[] = [players[0], ...rotating];
      for (let i = 0; i < half; i++) {
        const a = roundPlayers[i];
        const b = roundPlayers[m - 1 - i];
        if (a === null || b === null) continue;
        // Alternate home/away each round+position to balance appearances.
        const swap = (r + i) % 2 === 1;
        matches.push({
          tournamentId,
          group,
          homeTeamId: swap ? b : a,
          awayTeamId: swap ? a : b,
        });
      }
      rotating.unshift(rotating.pop()!);
    }

    return matches;
  }
}
