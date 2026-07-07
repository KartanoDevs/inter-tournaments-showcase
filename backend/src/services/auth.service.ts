import { AuthRepository } from '../repositories/auth.repository';
import { UnauthorizedError } from '../utils/errors';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async login(email: string, passwordPlain: string) {
    // 1. Buscar si el usuario existe y su cuenta está activa
    const user = await this.authRepository.findUserByEmail(email);

    if (!user || user.isDeleted) {
      throw new UnauthorizedError('Credenciales incorrectas o cuenta no disponible');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Esta cuenta se encuentra temporalmente suspendida');
    }

    // 2. Comprobar la contraseña armada (A prueba de balas con Argon2, estándar moderno de la industria)
    const isPasswordValid = await argon2.verify(user.password, passwordPlain);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    // 3. Generar el Pasaporte (JWT)
    const payload = {
      sub: user.id,            // Standard JWT Subject (ID)
      email: user.email,
      role: user.role,
      playerId: user.player?.id // Útil por si quiere editar su propia ficha en Front
    };

    // Firmar con la frase del .env (Duración: 12 horas por seguridad)
    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: '12h'
    });

    // Filtramos la password de la respuesta para el Frontend (Seguridad)
    const { password, isDeleted, ...safeUser } = user;

    return {
      token,
      user: safeUser
    };
  }

  async verifyAndGetUser(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedError('Usuario no válido');
    }
    const { password, isDeleted, ...safeUser } = user;
    return safeUser;
  }
}
