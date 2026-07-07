import { PrismaClient, Prisma } from '@prisma/client';

export class SponsorRepository {
  constructor(private db: PrismaClient) {}

  async findAllActive() {
    return this.db.sponsor.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findById(id: string) {
    return this.db.sponsor.findUnique({
      where: { id }
    });
  }

  async create(data: Prisma.SponsorCreateInput) {
    return this.db.sponsor.create({ data });
  }

  async update(id: string, data: Prisma.SponsorUpdateInput) {
    return this.db.sponsor.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.db.sponsor.delete({
      where: { id }
    });
  }
}
