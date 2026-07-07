import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { MessageService } from 'primeng/api';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const messageService = inject( MessageService );

  if (authService.hasValidSession()) {
    return true;
  }

  // Not logged in, redirect to home page as requested
  messageService.add( { severity: 'error', summary: 'Acceso Denegado', detail: 'Debes iniciar sesión.' } );
  return router.parseUrl( '/home' );
};
