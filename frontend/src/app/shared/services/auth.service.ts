import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  status: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      role: string;
      playerId?: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  // Signal properties to maintain auth state
  currentUser = signal<AuthResponse['data']['user'] | null>(null);
  isAuthenticated = signal<boolean>(false);

  // Computed signals for role checking
  isAdmin = computed( () =>
  {
    const role = this.currentUser()?.role;
    return role === 'ADMIN' || role === 'SUPERADMIN';
  } );

  hasRole( role: string ): boolean
  {
    return this.currentUser()?.role === role;
  }

  hasAnyRole( roles: string[] ): boolean
  {
    const userRole = this.currentUser()?.role;
    return userRole ? roles.includes( userRole ) : false;
  }

  constructor() {
    this.hydrateAuthState();
  }

  // Check localStorage and restore session if token exists
  private hydrateAuthState() {
    const token = localStorage.getItem('vongola_token');
    if (token) {
      // Basic check, actual validation would be hitting /api/auth/me
      this.isAuthenticated.set(true);
      
      const userData = localStorage.getItem('vongola_user');
      if (userData) {
        try {
          this.currentUser.set(JSON.parse(userData));
        } catch (e) {
          console.error('Failed to parse user data from localStorage', e);
        }
      }
    }
  }

  login(email: string, passwordPlain: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password: passwordPlain }).pipe(
      tap(response => {
        if (response.status === 'success') {
          // Store securely in localStorage
          localStorage.setItem('vongola_token', response.data.token);
          localStorage.setItem('vongola_user', JSON.stringify(response.data.user));
          
          // Update Signals
          this.currentUser.set(response.data.user);
          this.isAuthenticated.set(true);
        }
      }),
      catchError(error => {
        console.error('Login Error:', error);
        return throwError(() => error);
      })
    );
  }

  logout() {
    localStorage.removeItem('vongola_token');
    localStorage.removeItem('vongola_user');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate( [ '/torneos' ] ); // Redirect to home on logout
  }

  getToken(): string | null {
    return localStorage.getItem('vongola_token');
  }

  // Can be used by guards or other components synchronously
  hasValidSession(): boolean {
    return !!this.getToken();
  }
}
