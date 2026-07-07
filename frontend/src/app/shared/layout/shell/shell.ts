import { Component, inject } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { NavbarBottom } from '../navbar-bottom/navbar-bottom';
import { RotateDevice } from '../../components/rotate-device/rotate-device';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [ RouterModule, CommonModule, NavbarBottom, RotateDevice ],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell {
  private router = inject( Router );
  private location = inject( Location );

  private routesWithoutHeader = [ '/admin', '/scoreboard' ];

  shouldHideHeader = toSignal(
    this.router.events.pipe(
      filter( event => event instanceof NavigationEnd ),
      map( ( event: any ) =>
      {
        const url = event.urlAfterRedirects.toLowerCase();
        return this.routesWithoutHeader.some( route => url.includes( route ) );
      } )
    ),
    { initialValue: this.checkInitialRoute() }
  );

  private checkInitialRoute(): boolean
  {
    const url = this.location.path().toLowerCase();
    return this.routesWithoutHeader.some( route => url.includes( route ) );
  }
}
