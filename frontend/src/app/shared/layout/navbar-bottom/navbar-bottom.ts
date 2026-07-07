import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar-bottom',
  imports: [ RouterModule, CommonModule ],
  templateUrl: './navbar-bottom.html',
  styleUrl: './navbar-bottom.css',
})
export class NavbarBottom {
  auth = inject( AuthService );
}
