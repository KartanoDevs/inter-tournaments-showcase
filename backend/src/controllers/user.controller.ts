import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json({ status: 'success', data: users });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.userService.getUserById(req.params.id as string);
      res.status(200).json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Nota: Aquí se debería añadir Zod para validar el Req.Body en el futuro
      const newUser = await this.userService.createUser(req.body);
      res.status(201).json({ status: 'success', data: newUser });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedUser = await this.userService.updateUser(req.params.id as string, req.body);
      res.status(200).json({ status: 'success', data: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await this.userService.softDeleteUser(req.params.id as string);
      res.status(204).send(); // 204 No Content tras un borrado exitoso
    } catch (error) {
      next(error);
    }
  }
}
