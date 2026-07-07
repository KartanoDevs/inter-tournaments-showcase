import { PrismaClient, Prisma } from '@prisma/client';

export class UserRepository {
  constructor(private db: PrismaClient) {}

  async findAllActive() {
    return this.db.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        metadata: true,
        createdAt: true,
        player: { select: { id: true, firstName: true, lastName: true } }
      }
    });
  }

  async findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isDeleted: true,
        metadata: true,
        createdAt: true,
        player: true
      }
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.db.user.create({
      data,
      select: { id: true, email: true, role: true }
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, isActive: true, isDeleted: true }
    });
  }
}
