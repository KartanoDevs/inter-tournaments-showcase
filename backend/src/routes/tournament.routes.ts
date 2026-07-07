import { Router } from 'express';
import multer from 'multer';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { TournamentController } from '../controllers/tournament.controller';
import { TournamentBackupController } from '../controllers/tournament-backup.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();
const c = container.resolve<TournamentController>('tournamentController');
const bc = container.resolve<TournamentBackupController>('tournamentBackupController');
const uploadJson = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1_000_000 } });

// Públicos
router.get('/', asyncHandler((req, res, next) => c.getAll(req, res, next)));
router.get('/:id', asyncHandler((req, res, next) => c.getById(req, res, next)));
router.get('/:id/standings', asyncHandler((req, res, next) => c.getStandings(req, res, next)));

// Admin
router.post('/', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.create(req, res, next)));
router.patch('/:id', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.update(req, res, next)));
router.delete('/:id', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.delete(req, res, next)));

// Equipos del torneo
router.post('/:id/teams', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.addTeam(req, res, next)));
router.delete('/:id/teams/:teamId', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.removeTeam(req, res, next)));

// Sorteo
router.post('/:id/draw', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.draw(req, res, next)));
router.delete('/:id/draw', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.undoDraw(req, res, next)));

// Partidos
router.patch('/:id/matches/:matchId', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.updateMatch(req, res, next)));

// Fase eliminatoria
router.post('/:id/knockout', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => c.generateKnockout(req, res, next)));

// Backups / Módulo de Seguridad
router.get('/:id/backups', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.listBackups(req, res, next)));
router.post('/:id/backups', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.createManualBackup(req, res, next)));
router.post('/:id/backups/upload', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), uploadJson.single('file'), asyncHandler((req, res, next) => bc.uploadAndRestore(req, res, next)));
router.get('/:id/backups/:filename', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.downloadBackup(req, res, next)));
router.delete('/:id/backups/:filename', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.deleteBackup(req, res, next)));
router.post('/:id/restore', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.restore(req, res, next)));
router.get('/:id/export/current.csv', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.downloadCsv(req, res, next)));
router.get('/:id/export/xlsx', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => bc.downloadXlsx(req, res, next)));

export default router;
