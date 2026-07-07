import { PrismaClient, Prisma } from '@prisma/client';

export class TeamRepository {
  constructor(private db: PrismaClient) {}

  async findAllActive() {
    return this.db.team.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        shortName: true,
        logo: true,
        colorMain: true,
        colorSec: true,
        isActive: true
      }
    });
  }

  async findById(id: string) {
    return this.db.team.findUnique({
      where: { id },
      include: {
        players: {
          where: { isDeleted: false }
        }
      }
    });
  }

  async create(data: Prisma.TeamCreateInput) {
    return this.db.team.create({ data });
  }

  async update(id: string, data: Prisma.TeamUpdateInput) {
    return this.db.team.update({
      where: { id },
      data
    });
  }
}
