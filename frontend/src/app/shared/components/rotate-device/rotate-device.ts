import { Component, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-rotate-device',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rotate-device.html',
  styleUrl: './rotate-device.css'
})
export class RotateDevice {
  private router = inject(Router);
  private location = inject(Location);

  // Lista de rutas Vongola donde obligamos el modo paisaje
  private enforcedRoutes = ['/admin', '/scoreboard'];

  shouldShow = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: any) => {
        const url = event.urlAfterRedirects.toLowerCase();
        return this.enforcedRoutes.some(route => url.includes(route));
      })
    ),
    { initialValue: this.checkInitialRoute() }
  );

  private checkInitialRoute(): boolean {
    const url = this.location.path().toLowerCase();
    return this.enforcedRoutes.some(route => url.includes(route));
  }
}
