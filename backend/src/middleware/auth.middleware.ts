import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import { RoleType } from '@prisma/client';

export interface UserPayload {
  sub: string;     // user.id
  email: string;   
  role: RoleType;
  playerId?: string;
}

// Extender Express Request para inyectar este usuario validado
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Middleware 1: Frontera, exigir el pasaporte y validarlo matemáticamente
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Petición interceptada. Falla el Token de Autorización Bearer');
    }

    // Recortar la palabra "Bearer "
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Token no proveído');
    }

    // Verificar las firmas matemáticas
    const decodedPayload = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    
    // Todo en orden. Dejar pasar y clavar sus datos en la request (req) para el Controlador
    req.user = decodedPayload;
    
    next();
  } catch (error) {
    // Sea porque el token caducó ('jwt expired') o porque está falsificado ('invalid signature')
    next(new UnauthorizedError('Acceso Denegado. Pasaporte Invalido o Caducado'));
  }
};

// Middleware 2: Guardabosques (RBAC) - Restringir la ruta a 1 o más Roles
export const authorizeRole = (...rolesAllowed: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    
    if (!req.user || !req.user.role) {
      return next(new UnauthorizedError('No hay usuario autenticado contra quien verificar roles'));
    }

    const hasClearance = rolesAllowed.includes(req.user.role);

    if (!hasClearance) {
      // 403 Forbidden (Sabemos quién eres, pero no tienes nivel para esta puerta)
      return res.status(403).json({
        status: 'error',
        message: `Fallo de Rango: Esta área exige credenciales superiores. (${rolesAllowed.join(' o ')})`
      });
    }

    next();
  };
};
