import { PrismaClient, Prisma } from '@prisma/client';

export class PlayerRepository {
  constructor(private db: PrismaClient) {}

  async findAllActive(teamId?: string) {
    const whereClause: Prisma.PlayerWhereInput = { isDeleted: false };
    if (teamId) {
      whereClause.teamId = teamId;
    }

    return this.db.player.findMany({
      where: whereClause,
      include: {
        team: { select: { name: true, shortName: true, colorMain: true } }
      }
    });
  }

  async findById(id: string) {
    return this.db.player.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, colorMain: true, colorSec: true, shortName: true } },
        user: { select: { email: true } }
      }
    });
  }

  async create(data: Prisma.PlayerCreateInput) {
    return this.db.player.create({ data });
  }

  async update(id: string, data: Prisma.PlayerUpdateInput) {
    return this.db.player.update({
      where: { id },
      data
    });
  }
}
