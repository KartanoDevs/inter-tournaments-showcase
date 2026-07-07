import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Borrando Dependencias (Schedules, TournamentMatches)...');
  await prisma.schedule.deleteMany({});
  await prisma.tournamentMatch.deleteMany({});
  await prisma.tournament4v4Team.deleteMany({});
  await prisma.tournament.deleteMany({});

  console.log('Borrando Players...');
  await prisma.player.deleteMany({});
  
  console.log('Borrando Teams...');
  await prisma.team.deleteMany({});
  
  console.log('Limpieza completada con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
