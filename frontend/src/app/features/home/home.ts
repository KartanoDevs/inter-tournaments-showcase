import { Component, signal } from '@angular/core';
import { NeonButtonComponent } from '../../shared/components/neon-button/neon-button.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ NeonButtonComponent ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  // Dummy Data for Next Events
  upcomingEvents = signal([
    { id: 1, opponent: 'C.V. VENGADORES', date: '25 Nov 2025', time: '18:00', location: 'Pabellón Central' },
    { id: 2, opponent: 'LEONES VÓLEY', date: '02 Dic 2025', time: '20:30', location: 'Pabellón Visitante' }
  ]);
}
