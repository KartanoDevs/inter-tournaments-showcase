import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { MessageService } from 'primeng/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject( Router );
  const messageService = inject( MessageService );

  const token = authService.getToken();

  // Lista blanca de endpoints públicos por método + URL
  // Solo los GETs de equipos y jugadores son públicos.
  // Las mutaciones (POST, PATCH, DELETE) siempre requieren autenticación.
  const PUBLIC_ENDPOINTS: { method: string; url: string }[] = [
    { method: 'GET', url: '/api/players' },
    { method: 'GET', url: '/api/teams' },
    { method: 'POST', url: '/api/auth/login' },
    { method: 'GET', url: '/api/home' },
    { method: 'GET', url: '/api/sponsors' },
  ];

  const isPublicUrl = PUBLIC_ENDPOINTS.some(
    endpoint => req.method === endpoint.method && req.url.includes( endpoint.url )
  );

  // Clonar la petición añadiendo el JWT solo si el endpoint es privado y tenemos un token
  let clonedRequest = req;
  if ( token && !isPublicUrl )
  {
    clonedRequest = req.clone( {
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    } );
  }

  return next( clonedRequest ).pipe(
    catchError( ( error: HttpErrorResponse ) =>
    {
      // Si nos caza un 401 (Token inválido/expirado) o 403 (No tienes permisos)
      if ( error.status === 401 || error.status === 403 )
      {

        // Limpiamos la sesión porque nuestro token ya no vale nada o nos han pillado
        localStorage.removeItem( 'vongola_token' );
        localStorage.removeItem( 'vongola_user' );
        authService.currentUser.set( null );
        authService.isAuthenticated.set( false );

        const errorMessage = error.status === 401
          ? 'Sesión expirada o no válida.'
          : 'No tienes autoridad para ejecutar esta acción.';

        messageService.add( {
          severity: 'error',
          summary: 'Acceso Denegado',
          detail: errorMessage
        } );

        router.navigate( [ '/torneos' ] );
      }
      return throwError( () => error );
    } )
  );
};
