import { PrismaClient } from '@prisma/client';

// Capa "Repository". Separamos las consultas puras aquí para que, si cambiamos de BD mañana, 
// no haya que reprogramar TODA la lógica de negocio.
export class AuthRepository {
  constructor(private db: PrismaClient) {}

  async findUserByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
      // Traemos el rol y el id del jugador vinculado si lo tuviera (para frontend)
      include: {
        player: {
          select: { id: true }
        }
      }
    });
  }

  async findUserById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      include: {
        player: { select: { id: true }}
      }
    });
  }
}
