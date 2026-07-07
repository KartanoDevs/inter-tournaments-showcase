import { Router } from 'express';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Obtenemos el controlador del contenedor
const authController = container.resolve<AuthController>('authController');

// [PUBLIC] Iniciar Sesión y obtener JWT
router.post('/login', asyncHandler((req, res, next) => authController.login(req, res, next)));

// [PRIVATE] Obtener mis datos usando el Token (Para la carga inicial de Angular)
router.get('/me', authenticate, asyncHandler((req, res, next) => authController.getMe(req, res, next)));

export default router;
