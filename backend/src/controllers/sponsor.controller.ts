import { Request, Response, NextFunction } from 'express';
import { SponsorService } from '../services/sponsor.service';

export class SponsorController {
  constructor(private sponsorService: SponsorService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const sponsors = await this.sponsorService.getAllSponsors();
      res.status(200).json({ status: 'success', data: sponsors });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const sponsor = await this.sponsorService.getSponsorById(req.params.id as string);
      res.status(200).json({ status: 'success', data: sponsor });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      
      if (req.file) {
        data.logo = `/public/uploads/sponsors/${req.file.filename}`;
      }

      const sponsor = await this.sponsorService.createSponsor(data);
      res.status(201).json({ status: 'success', data: sponsor });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      if (req.file) {
        data.logo = `/public/uploads/sponsors/${req.file.filename}`;
      }

      const sponsor = await this.sponsorService.updateSponsor(req.params.id as string, data);
      res.status(200).json({ status: 'success', data: sponsor });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.sponsorService.deleteSponsor(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
