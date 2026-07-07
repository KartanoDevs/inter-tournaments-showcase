import { Router } from 'express';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { TeamController } from '../controllers/team.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const teamController = container.resolve<TeamController>('teamController');

// Todos pueden leer listas de equipos si están logueados (Ahora es público para todos)
router.get( '/', asyncHandler( ( req, res, next ) => teamController.getAll( req, res, next ) ) );
router.get( '/:id', asyncHandler( ( req, res, next ) => teamController.getById( req, res, next ) ) );

// Sólo los Administradores pueden gestionar equipos y subir su logo
// Nota: upload.single('logo') procesa la imagen entrante antes de llegar al controlador
router.post(
  '/', 
  authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), 
  upload.single('logo'),
  asyncHandler((req, res, next) => teamController.create(req, res, next))
);

router.patch(
  '/:id', 
  authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), 
  upload.single('logo'),
  asyncHandler((req, res, next) => teamController.update(req, res, next))
);

router.delete('/:id', authenticate, authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => teamController.delete(req, res, next)));

export default router;
