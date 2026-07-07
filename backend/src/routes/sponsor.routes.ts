import { Router } from 'express';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { SponsorController } from '../controllers/sponsor.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();
const sponsorController = container.resolve<SponsorController>('sponsorController');

// Rutas Públicas - El Frontend de Angular las consume para mostrar logos
router.get('/', asyncHandler((req, res, next) => sponsorController.getAll(req, res, next)));
router.get('/:id', asyncHandler((req, res, next) => sponsorController.getById(req, res, next)));

// Privilegiadas
router.post(
  '/', 
  authenticate, authorizeRole('SUPERADMIN'), // Sólo Dones Vongola tocan dinero/patrocinios
  upload.single('logoBase64'), // campo del formulario
  asyncHandler((req, res, next) => sponsorController.create(req, res, next))
);

router.patch(
  '/:id', 
  authenticate, authorizeRole('SUPERADMIN'), 
  upload.single('logoBase64'),
  asyncHandler((req, res, next) => sponsorController.update(req, res, next))
);

router.delete('/:id', authenticate, authorizeRole('SUPERADMIN'), asyncHandler((req, res, next) => sponsorController.delete(req, res, next)));

export default router;
