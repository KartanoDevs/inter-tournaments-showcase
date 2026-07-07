import { Router } from 'express';
import { container } from '../di-container';
import { asyncHandler } from '../middleware/error-handler';
import { UserController } from '../controllers/user.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();
const userController = container.resolve<UserController>('userController');

// ==========================================
// TODAS estas rutas requieren estar logueado
// ==========================================
router.use(authenticate); 

// Sólo SUPERADMINS o ADMINS pueden ver la lista completa de usuarios o crear uno de cero
router.get('/', authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => userController.getAllUsers(req, res, next)));
router.post('/', authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => userController.createUser(req, res, next)));

// Cualquier ROL puede pedir la info de un usuario si conoce su ID (útil para ver perfiles públicos de capitanes)
router.get('/:id', asyncHandler((req, res, next) => userController.getUser(req, res, next)));

// Actualizar o borrar requiere Rango Superior
router.patch('/:id', authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => userController.updateUser(req, res, next)));
router.delete('/:id', authorizeRole('SUPERADMIN', 'ADMIN'), asyncHandler((req, res, next) => userController.deleteUser(req, res, next)));

export default router;
