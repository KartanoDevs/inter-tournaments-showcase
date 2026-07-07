import { UserRepository } from '../repositories/user.repository';
import { NotFoundError, ConflictError } from '../utils/errors';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers() {
    return this.userRepository.findAllActive();
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('Usuario Vongola no encontrado en los registros');
    }
    return user;
  }

  async createUser(data: Prisma.UserCreateInput) {
    // Hashear la contraseña con Argon2 (Estándar 2026) antes de tocar la BD
    const hashedPassword = await argon2.hash(data.password as string);
    
    try {
      const newUser = await this.userRepository.create({
        ...data,
        password: hashedPassword
      });
      return newUser;
    } catch (error: any) {
      // Manejar el error de Email único de Prisma (P2002)
      if (error.code === 'P2002') {
        throw new ConflictError('Ya existe un sicario registrado con ese correo electrónico');
      }
      throw error;
    }
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    await this.getUserById(id); // Verifica que exista primero

    // Si también viene un cambio de contraseña en el Update, hay que hashearlo
    if (data.password) {
      data.password = await argon2.hash(data.password as string);
    }

    return this.userRepository.update(id, data);
  }

  async softDeleteUser(id: string) {
    await this.getUserById(id);
    // En lugar de borrar físicamente, pasamos a isDeleted: true
    return this.userRepository.update(id, { isDeleted: true, isActive: false });
  }
}
