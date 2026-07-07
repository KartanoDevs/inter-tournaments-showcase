import { PlayerRepository } from '../repositories/player.repository';
import { NotFoundError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export class PlayerService {
  constructor(private playerRepository: PlayerRepository) {}

  async getAllPlayers(teamId?: string) {
    return this.playerRepository.findAllActive(teamId);
  }

  async getPlayerById(id: string) {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new NotFoundError('Ficha deportiva no encontrada en la base de datos');
    }
    return player;
  }

  async createPlayer(data: Prisma.PlayerCreateInput) {
    return this.playerRepository.create(data);
  }

  async updatePlayer(id: string, data: Prisma.PlayerUpdateInput) {
    await this.getPlayerById(id);
    return this.playerRepository.update(id, data);
  }

  async softDeletePlayer(id: string) {
    await this.getPlayerById(id);
    return this.playerRepository.update(id, { isDeleted: true, isActive: false });
  }
}
