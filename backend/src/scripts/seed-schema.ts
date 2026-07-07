import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando creación de esquema manual...');
  const sqlString = fs.readFileSync(path.join(__dirname, '../../init.sql'), 'utf-8');
  
  // Dividir por sentencias
  const statements = sqlString.split(';').map(s => s.trim()).filter(Boolean);
  
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement + ';');
    } catch (e) {
      if (e instanceof Error && !e.message.includes('already exists')) {
        console.error('Error al ejecutar:', statement.substring(0, 50), e);
      }
    }
  }
  
  console.log('¡Esquema creado correctamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
