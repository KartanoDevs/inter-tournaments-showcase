import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AdminTournaments } from '../admin-tournaments/admin-tournaments';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ ButtonModule, TooltipModule, AdminTournaments ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
