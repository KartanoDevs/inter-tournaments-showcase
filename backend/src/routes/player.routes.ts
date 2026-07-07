import { Router } from 'express';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { PlayerController } from '../controllers/player.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const playerController = container.resolve<PlayerController>('playerController');

// Cualquier usuario, incluso sin loguearse, puede ver el roster
router.get( '/', asyncHandler( ( req, res, next ) => playerController.getAll( req, res, next ) ) );
router.get( '/:id', asyncHandler( ( req, res, next ) => playerController.getById( req, res, next ) ) );

// Sólo los Capos (ADMIN, SUPERADMIN) o Entrenadores de alto nivel (COACH) pueden fichar o modificar jugadores
router.post(
  '/', 
  // TODO: Permitir que un 'PLAYER' cree su propia ficha la 1º vez si no la tiene
  authenticate, authorizeRole('SUPERADMIN', 'ADMIN', 'COACH'), 
  upload.fields( [
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ] ),
  asyncHandler((req, res, next) => playerController.create(req, res, next))
);

router.patch(
  '/:id', 
  authenticate, authorizeRole('SUPERADMIN', 'ADMIN', 'COACH'), 
  upload.fields( [
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ] ),
  asyncHandler((req, res, next) => playerController.update(req, res, next))
);

router.delete('/:id', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => playerController.delete(req, res, next)));

export default router;
