import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TournamentService } from '../services/tournament.service';
import { ValidationError } from '../utils/errors';

const createSchema = z.object({
  name: z.string().min(1).max(150),
  date: z.string().datetime({ offset: true }).nullable().optional()
});

const updateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  date: z.string().datetime({ offset: true }).nullable().optional(),
  isActive: z.boolean().optional()
});

const addTeamSchema = z.object({
  name: z.string().min(1).max(100)
});

const updateMatchSchema = z.object({
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  played: z.boolean().optional()
});

function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError('Datos inválidos', result.error.issues);
  return result.data;
}

export class TournamentController {
  constructor(private service: TournamentService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.getAll();
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.getById(req.params['id'] as string);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async getStandings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.getStandings(req.params['id'] as string);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = validate(createSchema, req.body);
      const data = await this.service.create(body);
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = validate(updateSchema, req.body);
      const data = await this.service.update(req.params['id'] as string, body);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.service.delete(req.params['id'] as string);
      res.status(204).send();
    } catch (e) { next(e); }
  }

  async addTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = validate(addTeamSchema, req.body);
      const data = await this.service.addTeam(req.params['id'] as string, name);
      res.status(201).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async removeTeam(req: Request, res: Response, next: NextFunction) {
    try {
      await this.service.removeTeam(req.params['id'] as string, req.params['teamId'] as string);
      res.status(204).send();
    } catch (e) { next(e); }
  }

  async draw(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.draw(req.params['id'] as string);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async undoDraw(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.undoDraw(req.params['id'] as string);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async updateMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const body = validate(updateMatchSchema, req.body);
      const data = await this.service.updateMatch(req.params['id'] as string, req.params['matchId'] as string, body);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }

  async generateKnockout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.generateKnockout(req.params['id'] as string);
      res.status(200).json({ status: 'success', data });
    } catch (e) { next(e); }
  }
}
