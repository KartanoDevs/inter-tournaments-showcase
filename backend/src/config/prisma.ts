import { PrismaClient } from '@prisma/client';

// Prevenir múltiples instancias de Prisma en desarrollo con Live Reloading (Nodemon/ts-node-dev)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Apagado elegante
const gracefulShutdown = async () =>
{
  console.log( '\n[VONGOLA DB] Cerrando conexión con la Base de Datos...' );
  await prisma.$disconnect();
  process.exit( 0 );
};

process.on( 'SIGINT', gracefulShutdown );
process.on( 'SIGTERM', gracefulShutdown );
