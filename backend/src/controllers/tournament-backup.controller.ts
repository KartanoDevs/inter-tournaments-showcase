import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TournamentService } from '../services/tournament.service';
import { TournamentBackupService } from '../services/tournament-backup.service';
import { ValidationError, NotFoundError } from '../utils/errors';

const restoreSchema = z.object({
  filename: z.string().regex(/^snapshot-[a-zA-Z0-9._-]+\.json$/, 'Nombre de fichero inválido'),
});

const snapshotSchema = z.object({
  version: z.literal(1),
  createdAt: z.string(),
  trigger: z.string(),
  triggerDetail: z.string().default(''),
  tournament: z.object({
    id: z.string(),
    name: z.string(),
    date: z.string().nullable().optional(),
    isActive: z.boolean(),
    isDeleted: z.boolean(),
    createdAt: z.any(),
    updatedAt: z.any(),
  }),
  teams: z.array(z.object({
    id: z.string(),
    name: z.string(),
    group: z.string().nullable().optional(),
    drawOrder: z.number().nullable().optional(),
    tournamentId: z.string(),
    createdAt: z.any(),
  })),
  matches: z.array(z.object({
    id: z.string(),
    tournamentId: z.string(),
    phase: z.string(),
    group: z.string().nullable().optional(),
    homeTeamId: z.string(),
    awayTeamId: z.string(),
    homeScore: z.number().nullable().optional(),
    awayScore: z.number().nullable().optional(),
    played: z.boolean(),
    updatedAt: z.any(),
  })),
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError('Datos inválidos', result.error.issues);
  return result.data;
}

export class TournamentBackupController {
  constructor(
    private tournamentService: TournamentService,
    private backupService: TournamentBackupService
  ) {}

  async listBackups(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const data = this.backupService.listSnapshots(id);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async createManualBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const data = await this.tournamentService.createManualBackup(id);
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async downloadBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const filename = req.params['filename'] as string;
      const snapshot = this.backupService.readSnapshot(id, filename);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).json(snapshot);
    } catch (e) { next(e); }
  }

  async deleteBackup(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const filename = req.params['filename'] as string;
      this.backupService.deleteSnapshot(id, filename);
      res.status(204).send();
    } catch (e) { next(e); }
  }

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const { filename } = validate(restoreSchema, req.body);
      const raw = this.backupService.readSnapshot(id, filename);
      const snapshot = validate(snapshotSchema, raw);
      const data = await this.tournamentService.restore(id, snapshot as any);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async uploadAndRestore(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      if (!req.file) throw new ValidationError('Se requiere un fichero JSON');
      let parsed: unknown;
      try {
        parsed = JSON.parse(req.file.buffer.toString('utf-8'));
      } catch {
        throw new ValidationError('El fichero no es JSON válido');
      }
      const snapshot = validate(snapshotSchema, parsed);
      const data = await this.tournamentService.restore(id, snapshot as any);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async downloadCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const content = this.backupService.getCsvContent(id);
      if (!content) throw new NotFoundError('No hay datos CSV disponibles para este torneo');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="torneo-${id}.csv"`);
      res.status(200).send(content);
    } catch (e) { next(e); }
  }

  async downloadXlsx(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const full = await this.tournamentService.getById(id);
      const standings = await this.tournamentService.getStandings(id);
      const buffer = this.backupService.generateXlsxBuffer(full, standings);

      const safeName = (full.name ?? id)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').toLowerCase();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="torneo-${safeName}.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (e) { next(e); }
  }
}
