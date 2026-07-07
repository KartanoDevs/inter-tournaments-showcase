import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentMatch } from '../../../shared/models/tournament.model';

@Component({
  selector: 'app-tournaments-match-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .match-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.6rem;
      border-radius: 6px;
      border: 1px solid rgba(0, 229, 255, 0.15);
      background: rgba(0, 0, 0, 0.3);
    }
    .match-row.match-row-played {
      border-color: rgba(0, 255, 170, 0.22);
      background: rgba(0, 255, 170, 0.04);
    }

    .team-name {
      flex: 1 1 0;
      font-size: clamp(0.75rem, 2.2vw, 0.95rem);
      color: #e0e6ed;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      min-width: 0;
      text-align: center;
    }

    .score-block {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      flex-shrink: 0;
    }

    .score-readonly {
      width: 32px;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(0, 229, 255, 0.25);
      border-radius: 4px;
      color: #e0e6ed;
      font-size: 1rem;
      font-weight: bold;
      font-family: 'Orbitron', 'Courier New', monospace;
      padding: 0.2rem 0.15rem;
    }
    .match-row.match-row-played .score-readonly {
      border-color: rgba(0, 255, 170, 0.35);
      color: #00ffaa;
    }
    .score-readonly.score-empty {
      color: rgba(224, 230, 237, 0.4);
    }

    .score-separator {
      color: rgba(0, 229, 255, 0.5);
      font-weight: bold;
      font-size: 0.9rem;
      width: 8px;
      text-align: center;
    }
  `],
  template: `
    <div class="match-row" [class.match-row-played]="match.played">
      <span class="team-name team-home">{{ match.homeTeam.name }}</span>
      <div class="score-block">
        <span class="score-readonly" [class.score-empty]="match.homeScore === null">{{ match.homeScore ?? '—' }}</span>
        <span class="score-separator">-</span>
        <span class="score-readonly" [class.score-empty]="match.awayScore === null">{{ match.awayScore ?? '—' }}</span>
      </div>
      <span class="team-name team-away">{{ match.awayTeam.name }}</span>
    </div>
  `
})
export class MobileMatchRowComponent {
  @Input({ required: true }) match!: TournamentMatch;
}
