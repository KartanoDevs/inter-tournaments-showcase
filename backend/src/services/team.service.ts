import { TeamRepository } from '../repositories/team.repository';
import { NotFoundError, ConflictError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export class TeamService {
  constructor(private teamRepository: TeamRepository) {}

  async getAllTeams() {
    return this.teamRepository.findAllActive();
  }

  async getTeamById(id: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundError('Equipo no encontrado en la base de datos');
    }
    return team;
  }

  async createTeam(data: Prisma.TeamCreateInput) {
    try {
      return await this.teamRepository.create(data);
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictError('Ya existe un equipo con ese nombre oficial');
      }
      throw error;
    }
  }

  async updateTeam(id: string, data: Prisma.TeamUpdateInput) {
    await this.getTeamById(id);
    return this.teamRepository.update(id, data);
  }

  async softDeleteTeam(id: string) {
    await this.getTeamById(id);
    return this.teamRepository.update(id, { isDeleted: true, isActive: false });
  }
}
