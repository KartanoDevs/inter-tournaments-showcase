import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Falta email o contraseña en la petición' });
    }

    try {
      const authData = await this.authService.login(email, password);
      
      // Enviamos el Token y los datos seguros (El pasaporte y la identidad) al Frontend
      res.status(200).json({
        status: 'success',
        data: authData
      });
    } catch (error) {
       // Delegamos en el ErrorHandler Global (middleware/error-handler.ts)
      next(error);
    }
  }

  // Se usa para refrescar el perfil (F5) en FrontEnd basándonos en si el pasaporte (JWT) sigue vivo
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user es inyectado por el auth.middleware.ts que comprueba el JWT antes de llegar aquí
      if (!req.user || !req.user.sub) {
        return res.status(401).json({ status: 'error', message: 'No se encontró identidad en el JWT' });
      }

      // El JWT sólo tiene el id a salvo, busquemos el resto de foto, email o flags activos
      const fullUser = await this.authService.verifyAndGetUser(req.user.sub);
      
      res.status(200).json({
        status: 'success',
        data: { user: fullUser }
      });
    } catch (error) {
      next(error);
    }
  }
}
