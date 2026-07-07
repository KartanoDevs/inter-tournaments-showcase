import { PrismaClient, TournamentGroup, TournamentPhase } from '@prisma/client';

export class TournamentRepository {
  constructor(private db: PrismaClient) {}

  async findAllActive() {
    return this.db.tournament.findMany({
      where: { isDeleted: false },
      include: { teams: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return this.db.tournament.findUnique({
      where: { id },
      include: {
        teams: { orderBy: [{ group: 'asc' }, { drawOrder: 'asc' }] },
        matches: {
          include: { homeTeam: true, awayTeam: true },
          orderBy: [{ group: 'asc' }, { updatedAt: 'asc' }]
        }
      }
    });
  }

  async create(data: { name: string; date?: Date | null }) {
    return this.db.tournament.create({ data });
  }

  async update(id: string, data: { name?: string; date?: Date | null; isActive?: boolean }) {
    return this.db.tournament.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.db.tournament.update({
      where: { id },
      data: { isDeleted: true, isActive: false }
    });
  }

  async addTeam(tournamentId: string, name: string) {
    return this.db.tournament4v4Team.create({
      data: { tournamentId, name }
    });
  }

  async deleteTeam(id: string) {
    return this.db.tournament4v4Team.delete({ where: { id } });
  }

  async findTeam(id: string) {
    return this.db.tournament4v4Team.findUnique({ where: { id } });
  }

  async findTeamsByTournament(tournamentId: string) {
    return this.db.tournament4v4Team.findMany({
      where: { tournamentId },
      orderBy: [{ group: 'asc' }, { drawOrder: 'asc' }]
    });
  }

  async assignGroupsAndOrders(
    assignments: { id: string; group: TournamentGroup; drawOrder: number }[]
  ) {
    return this.db.$transaction(
      assignments.map(({ id, group, drawOrder }) =>
        this.db.tournament4v4Team.update({
          where: { id },
          data: { group, drawOrder }
        })
      )
    );
  }

  async createMatches(
    matches: {
      tournamentId: string;
      phase?: TournamentPhase;
      group?: TournamentGroup | null;
      homeTeamId: string;
      awayTeamId: string;
    }[]
  ) {
    return this.db.tournamentMatch.createMany({ data: matches });
  }

  async findMatchesByTournament(tournamentId: string) {
    return this.db.tournamentMatch.findMany({
      where: { tournamentId },
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ phase: 'asc' }, { group: 'asc' }]
    });
  }

  async findMatch(id: string) {
    return this.db.tournamentMatch.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true }
    });
  }

  async updateMatch(
    id: string,
    data: { homeScore?: number | null; awayScore?: number | null; played?: boolean }
  ) {
    return this.db.tournamentMatch.update({ where: { id }, data, include: { homeTeam: true, awayTeam: true } });
  }

  async deleteMatchesByTournament(tournamentId: string) {
    return this.db.tournamentMatch.deleteMany({ where: { tournamentId } });
  }

  async hasPlayedMatches(tournamentId: string) {
    const count = await this.db.tournamentMatch.count({
      where: { tournamentId, played: true }
    });
    return count > 0;
  }

  async resetGroupAssignments(tournamentId: string) {
    return this.db.tournament4v4Team.updateMany({
      where: { tournamentId },
      data: { group: null, drawOrder: null }
    });
  }

  async hasDrawn(tournamentId: string) {
    const team = await this.db.tournament4v4Team.findFirst({
      where: { tournamentId, group: { not: null } }
    });
    return !!team;
  }

  async hasAllGroupMatchesPlayed(tournamentId: string) {
    const pending = await this.db.tournamentMatch.count({
      where: { tournamentId, phase: TournamentPhase.GROUP, played: false }
    });
    return pending === 0;
  }

  async hasKnockoutMatches(tournamentId: string) {
    const count = await this.db.tournamentMatch.count({
      where: { tournamentId, phase: { not: TournamentPhase.GROUP } }
    });
    return count > 0;
  }

  async findMatchesByPhase(tournamentId: string, phase: TournamentPhase) {
    return this.db.tournamentMatch.findMany({
      where: { tournamentId, phase },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { updatedAt: 'asc' }
    });
  }

  async restoreFromSnapshot(tournamentId: string, snapshot: any) {
    return this.db.$transaction(async (tx) => {
      await tx.tournamentMatch.deleteMany({ where: { tournamentId } });
      await tx.tournament4v4Team.deleteMany({ where: { tournamentId } });

      if (snapshot.teams.length > 0) {
        await tx.tournament4v4Team.createMany({
          data: snapshot.teams.map((t: any) => ({
            id: t.id,
            name: t.name,
            group: t.group as TournamentGroup | null,
            drawOrder: t.drawOrder ?? null,
            tournamentId: t.tournamentId,
          })),
        });
      }

      if (snapshot.matches.length > 0) {
        await tx.tournamentMatch.createMany({
          data: snapshot.matches.map((m: any) => ({
            id: m.id,
            tournamentId: m.tournamentId,
            phase: m.phase as TournamentPhase,
            group: m.group as TournamentGroup | null,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
            homeScore: m.homeScore ?? null,
            awayScore: m.awayScore ?? null,
            played: m.played ?? false,
          })),
        });
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          name: snapshot.tournament.name,
          date: snapshot.tournament.date ? new Date(snapshot.tournament.date) : null,
          isActive: snapshot.tournament.isActive,
          isDeleted: snapshot.tournament.isDeleted,
        },
      });

      return tx.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          teams: { orderBy: [{ group: 'asc' }, { drawOrder: 'asc' }] },
          matches: {
            include: { homeTeam: true, awayTeam: true },
            orderBy: [{ group: 'asc' }, { updatedAt: 'asc' }]
          }
        }
      });
    });
  }
}
