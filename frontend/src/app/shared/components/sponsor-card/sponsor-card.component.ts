import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sponsor } from '../../../features/contact/services/sponsor.model';

@Component({
  selector: 'app-sponsor-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sponsor-card.component.html',
  styleUrls: ['./sponsor-card.component.css']
})
export class SponsorCardComponent {
  @Input() sponsor!: Sponsor;
}
