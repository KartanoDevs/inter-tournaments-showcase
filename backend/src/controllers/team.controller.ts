import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';
import fs from 'fs';
import path from 'path';

export class TeamController {
  constructor(private teamService: TeamService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const teams = await this.teamService.getAllTeams();
      res.status(200).json({ status: 'success', data: teams });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const team = await this.teamService.getTeamById(req.params.id as string);
      res.status(200).json({ status: 'success', data: team });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };

      // FormData envía booleans como strings. Lo parseamos:
      if ( data.isActive !== undefined )
      {
        data.isActive = data.isActive === 'true' || data.isActive === true;
      }
      // 1. Guardar primero para obtener el Id
      const team = await this.teamService.createTeam( data );

      // 2. Si vino logo, lo movemos a su carpeta oficial
      let finalLogoUrl = '';
      if (req.file) {
        const teamDir = path.join( 'public/uploads/teams', team.id );
        if ( !fs.existsSync( teamDir ) )
        {
          fs.mkdirSync( teamDir, { recursive: true } );
        }

        const ext = path.extname( req.file.originalname );
        const finalPath = path.join( teamDir, `logo${ ext }` );
        fs.renameSync( req.file.path, finalPath );
        finalLogoUrl = `/public/uploads/teams/${ team.id }/logo${ ext }`;

        // 3. Actualizamos la BD con la URL real
        await this.teamService.updateTeam( team.id, { logo: finalLogoUrl } );
        team.logo = finalLogoUrl;
      }

      res.status(201).json({ status: 'success', data: team });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };

      if ( data.isActive !== undefined )
      {
        data.isActive = data.isActive === 'true' || data.isActive === true;
      }

      if (req.file) {
        data.logo = `/public/uploads/teams/${ req.params.id }/${ req.file.filename }`;
      }

      const team = await this.teamService.updateTeam(req.params.id as string, data);
      res.status(200).json({ status: 'success', data: team });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.teamService.softDeleteTeam(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
