import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { MessageService } from 'primeng/api';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const messageService = inject(MessageService);

  if (authService.hasValidSession() && authService.isAdmin()) {
    return true;
  }

  messageService.add({ severity: 'error', summary: 'Acceso Denegado', detail: 'Solo personal autorizado puede entrar en esta zona.' });
  return router.parseUrl('/torneos');
};
