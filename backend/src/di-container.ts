// Patrón Contenedor de Inyección de Dependencias
// Nos ahorra tener que instanciar manualmente controladores y servicios en cada archivo de rutas.

class Container {
  private instances = new Map<string, any>();

  register<T>(key: string, factory: () => T): void {
    this.instances.set(key, factory);
  }

  resolve<T>(key: string): T {
    const factory = this.instances.get(key);
    if (!factory) {
      throw new Error(`[DI] No factory registered for ${key}`);
    }
    return factory();
  }

  singleton<T>(key: string, factory: () => T): void {
    let instance: T;
    this.instances.set(key, () => {
      if (!instance) {
        instance = factory();
      }
      return instance;
    });
  }
}

export const container = new Container();

// ==========================================
// REGISTRO DE DEPENDENCIAS (Wiring)
// ==========================================

import { prisma } from './config/prisma';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

import { TeamRepository } from './repositories/team.repository';
import { TeamService } from './services/team.service';
import { TeamController } from './controllers/team.controller';

import { PlayerRepository } from './repositories/player.repository';
import { PlayerService } from './services/player.service';
import { PlayerController } from './controllers/player.controller';



import { SponsorRepository } from './repositories/sponsor.repository';
import { SponsorService } from './services/sponsor.service';
import { SponsorController } from './controllers/sponsor.controller';



import { TournamentRepository } from './repositories/tournament.repository';
import { TournamentService } from './services/tournament.service';
import { TournamentController } from './controllers/tournament.controller';
import { TournamentBackupService } from './services/tournament-backup.service';
import { TournamentBackupController } from './controllers/tournament-backup.controller';
import { DropboxUploader } from './services/dropbox-uploader';

const dropboxUploader = (() => {
  const appKey = process.env['DROPBOX_APP_KEY'];
  const appSecret = process.env['DROPBOX_APP_SECRET'];
  const refreshToken = process.env['DROPBOX_REFRESH_TOKEN'];
  const baseFolder = process.env['DROPBOX_BACKUP_FOLDER'] || '/Backups Torneo Inter AUU';

  const faltantes = [
    !appKey       && 'DROPBOX_APP_KEY',
    !appSecret    && 'DROPBOX_APP_SECRET',
    !refreshToken && 'DROPBOX_REFRESH_TOKEN',
  ].filter(Boolean);

  if (faltantes.length > 0) {
    console.warn(`[dropbox] DESACTIVADO — faltan variables: ${faltantes.join(', ')}. Los backups NO se subirán a Dropbox (solo se guardarán en local).`);
    return undefined;
  }
  try {
    const uploader = new DropboxUploader({ appKey: appKey!, appSecret: appSecret!, refreshToken: refreshToken!, baseFolder });
    console.log(`[dropbox] ACTIVO — subida de backups habilitada. Carpeta base: "${baseFolder}"`);
    return uploader;
  } catch {
    console.error('[dropbox] Credenciales inválidas — upload desactivado');
    return undefined;
  }
})();

// 1. Núcleo (BD)
container.singleton("prisma", () => prisma);

// 2. Repositorios (Capa de Acceso a Datos)
container.singleton("authRepository", () => new AuthRepository(container.resolve("prisma")));
container.singleton("userRepository", () => new UserRepository(container.resolve("prisma")));
container.singleton("teamRepository", () => new TeamRepository(container.resolve("prisma")));
container.singleton("playerRepository", () => new PlayerRepository(container.resolve("prisma")));

container.singleton("sponsorRepository", () => new SponsorRepository(container.resolve("prisma")));

container.singleton("tournamentRepository", () => new TournamentRepository(container.resolve("prisma")));

// 3. Servicios (Capa de Lógica de Negocio)
container.singleton("authService", () => new AuthService(container.resolve("authRepository")));
container.singleton("userService", () => new UserService(container.resolve("userRepository")));
container.singleton("teamService", () => new TeamService(container.resolve("teamRepository")));
container.singleton("playerService", () => new PlayerService(container.resolve("playerRepository")));

container.singleton("sponsorService", () => new SponsorService(container.resolve("sponsorRepository")));

container.singleton("tournamentBackupService", () => new TournamentBackupService(dropboxUploader));
container.singleton("tournamentService", () => new TournamentService(
  container.resolve("tournamentRepository"),
  container.resolve("tournamentBackupService")
));

// 4. Controladores (Capa de Entrada HTTP)
container.register("authController", () => new AuthController(container.resolve("authService")));
container.register("userController", () => new UserController(container.resolve("userService")));
container.register("teamController", () => new TeamController(container.resolve("teamService")));
container.register("playerController", () => new PlayerController(container.resolve("playerService")));

container.register("sponsorController", () => new SponsorController(container.resolve("sponsorService")));

container.register("tournamentController", () => new TournamentController(container.resolve("tournamentService")));
container.register("tournamentBackupController", () => new TournamentBackupController(
  container.resolve("tournamentService"),
  container.resolve("tournamentBackupService")
));
