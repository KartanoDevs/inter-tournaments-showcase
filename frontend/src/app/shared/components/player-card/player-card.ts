import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '../../models/player.model';
import { PositionLabelPipe } from '../../pipes/position-label.pipe';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule, PositionLabelPipe],
  templateUrl: './player-card.html',
  styleUrl: './player-card.css'
})
export class PlayerCard {
  player = input.required<Player>();
  gender = input<'MALE' | 'FEMALE'>('MALE');
  cardClick = output<Player>();

  protected thumbUrl = computed(() => {
    const p = this.player();
    return p.thumbnailUrl || p.imageUrl;
  });

  protected imageUrl = computed(() => {
    // El proxy de dev-server redirige /public → backend:3000/public.
    // En producción lo sirve el servidor de estáticos (Nginx/Express).
    return this.thumbUrl() ?? '';
  });

  protected displayName = computed(() => {
    const p = this.player();
    return p.nickname || `${p.firstName} ${p.lastName}`;
  });

  onCardAction() {
    this.cardClick.emit(this.player());
  }
}
