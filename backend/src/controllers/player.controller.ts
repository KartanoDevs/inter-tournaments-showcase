import { Request, Response, NextFunction } from 'express';
import { PlayerService } from '../services/player.service';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/errors';

export class PlayerController {
  constructor(private playerService: PlayerService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.query;
      const players = await this.playerService.getAllPlayers(teamId as string | undefined);
      res.status(200).json({ status: 'success', data: players });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const player = await this.playerService.getPlayerById(req.params.id as string);
      res.status(200).json({ status: 'success', data: player });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      
      // FormData envía todo como string. Parseamos los numéricos:
      if ( data.number !== undefined && data.number !== null && data.number !== '' )
      {
        data.number = parseInt( data.number, 10 );
      }
      if ( data.heightCm !== undefined && data.heightCm !== null && data.heightCm !== '' )
      {
        data.heightCm = parseInt( data.heightCm, 10 );
      }
      if ( data.isActive !== undefined )
      {
        data.isActive = data.isActive === 'true' || data.isActive === true;
      }
      if ( data.isCaptain !== undefined )
      {
        data.isCaptain = data.isCaptain === 'true' || data.isCaptain === true;
      }
      if ( data.isPoke !== undefined )
      {
        data.isPoke = data.isPoke === 'true' || data.isPoke === true;
      }

      // 1. Validar que la imagen principal exista al crear
      if ( !req.files || !( req.files as any )[ 'image' ] )
      {
        throw new AppError( 'La imagen de perfil (image) es obligatoria al crear un jugador.', 400 );
      }

      // TODO: Añadir lógica para que, si el ROL es 'PLAYER', sólo pueda asociarse a su propio usuario (userId)

      // 2. Guardar el jugador SIN imágenes para obtener el ID real
      const player = await this.playerService.createPlayer( data );

      // 3. Mover los archivos de temp a su carpeta definitiva
      const playerDir = path.join( 'public/uploads/players', player.id );
      if ( !fs.existsSync( playerDir ) )
      {
        fs.mkdirSync( playerDir, { recursive: true } );
      }

      const files = req.files as { [ fieldname: string ]: Express.Multer.File[] };
      let finalImageUrl = '';
      let finalThumbnailUrl = '';

      if ( files[ 'image' ] && files[ 'image' ][ 0 ] )
      {
        const file = files[ 'image' ][ 0 ];
        const ext = path.extname( file.originalname );
        const finalPath = path.join( playerDir, `profile${ ext }` );
        fs.renameSync( file.path, finalPath );
        finalImageUrl = `/public/uploads/players/${ player.id }/profile${ ext }`;
      }

      if ( files[ 'thumbnail' ] && files[ 'thumbnail' ][ 0 ] )
      {
        const file = files[ 'thumbnail' ][ 0 ];
        const ext = path.extname( file.originalname );
        const finalPath = path.join( playerDir, `thumbnail${ ext }` );
        fs.renameSync( file.path, finalPath );
        finalThumbnailUrl = `/public/uploads/players/${ player.id }/thumbnail${ ext }`;
      } else
      {
        // Fallback: Si no hay miniatura, usamos la misma URL de la imagen normal
        finalThumbnailUrl = finalImageUrl;
      }

      // 4. Actualizar el jugador con las rutas reales
      const updatedPlayer = await this.playerService.updatePlayer( player.id, {
        imageUrl: finalImageUrl,
        thumbnailUrl: finalThumbnailUrl
      } );

      res.status( 201 ).json( { status: 'success', data: updatedPlayer } );
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };

      // FormData envía todo como string. Parseamos los numéricos:
      if ( data.number !== undefined && data.number !== null && data.number !== '' )
      {
        data.number = parseInt( data.number, 10 );
      }
      if ( data.heightCm !== undefined && data.heightCm !== null && data.heightCm !== '' )
      {
        data.heightCm = parseInt( data.heightCm, 10 );
      }
      if ( data.isActive !== undefined )
      {
        data.isActive = data.isActive === 'true' || data.isActive === true;
      }
      if ( data.isCaptain !== undefined )
      {
        data.isCaptain = data.isCaptain === 'true' || data.isCaptain === true;
      }
      if ( data.isPoke !== undefined )
      {
        data.isPoke = data.isPoke === 'true' || data.isPoke === true;
      }

      // Procesamiento de múltiples archivos desde Multer (.fields)
      if ( req.files )
      {
        const files = req.files as { [ fieldname: string ]: Express.Multer.File[] };

        // Al ser actualización, upload middleware ya lo guardó en la carpeta del jugador
        if ( files[ 'image' ] && files[ 'image' ][ 0 ] )
        {
          data.imageUrl = `/public/uploads/players/${ req.params.id }/${ files[ 'image' ][ 0 ].filename }`;
        }

        if ( files[ 'thumbnail' ] && files[ 'thumbnail' ][ 0 ] )
        {
          data.thumbnailUrl = `/public/uploads/players/${ req.params.id }/${ files[ 'thumbnail' ][ 0 ].filename }`;
        }
      }

      const player = await this.playerService.updatePlayer(req.params.id as string, data);
      res.status(200).json({ status: 'success', data: player });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.playerService.softDeletePlayer(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
