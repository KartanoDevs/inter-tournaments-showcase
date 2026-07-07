import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentMatch } from '../../../shared/models/tournament.model';

@Component({
  selector: 'app-match-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .match-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 1rem;
      border-radius: 6px;
      border: 1px solid rgba(0, 229, 255, 0.15);
      background: rgba(0, 0, 0, 0.25);
      transition: border-color 0.2s;
    }
    .match-row.match-row-dirty {
      border-color: rgba(255, 165, 0, 0.5);
      box-shadow: 0 0 6px rgba(255, 165, 0, 0.2);
    }
    .match-row.match-row-played {
      border-color: rgba(0, 255, 170, 0.2);
      background: rgba(0, 255, 170, 0.03);
    }

    .team-name {
      flex: 1 1 0;
      font-size: 0.92rem;
      color: #e0e6ed;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .team-home { text-align: right; }
    .team-away { text-align: left; }

    .score-block {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .score-separator {
      color: rgba(0, 229, 255, 0.5);
      font-weight: bold;
      font-size: 1.1rem;
      width: 12px;
      text-align: center;
    }

    .score-readonly {
      width: 64px;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(0, 229, 255, 0.25);
      border-radius: 5px;
      color: #e0e6ed;
      font-size: 1.25rem;
      font-weight: bold;
      font-family: 'Orbitron', 'Courier New', monospace;
      padding: 0.45rem 0.25rem;
    }
    .match-row.match-row-played .score-readonly {
      border-color: rgba(0, 255, 170, 0.35);
      color: #00ffaa;
    }
    .score-readonly.score-empty {
      color: rgba(224, 230, 237, 0.4);
    }

    input[type=number].score-input {
      width: 64px;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(0, 229, 255, 0.35);
      border-radius: 5px;
      color: #e0e6ed;
      font-size: 1.25rem;
      font-weight: bold;
      font-family: 'Orbitron', 'Courier New', monospace;
      padding: 0.45rem 0.25rem;
      transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;
      -moz-appearance: textfield;
    }
    input[type=number].score-input::-webkit-inner-spin-button,
    input[type=number].score-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number].score-input:focus {
      outline: none;
      border-color: var(--neon-cyan, #00e5ff);
      box-shadow: 0 0 8px rgba(0, 229, 255, 0.55);
      color: var(--neon-cyan, #00e5ff);
    }
    input[type=number].score-input.score-dirty {
      border-color: rgba(255, 165, 0, 0.8);
      box-shadow: 0 0 6px rgba(255, 165, 0, 0.45);
      color: #ffa500;
    }
    input[type=number].score-input.score-played {
      border-color: rgba(0, 255, 170, 0.4);
      color: #00ffaa;
    }
    input[type=number].score-input.score-played:focus {
      border-color: #00ffaa;
      box-shadow: 0 0 8px rgba(0, 255, 170, 0.5);
    }
  `],
  template: `
    <div class="match-row"
      [class.match-row-played]="match.played && !dirty"
      [class.match-row-dirty]="dirty">
      <span class="team-name team-home">{{ match.homeTeam.name }}</span>
      <div class="score-block">
        @if (readOnly) {
          <span class="score-readonly" [class.score-empty]="match.homeScore === null">{{ match.homeScore ?? '—' }}</span>
          <span class="score-separator">-</span>
          <span class="score-readonly" [class.score-empty]="match.awayScore === null">{{ match.awayScore ?? '—' }}</span>
        } @else {
          <input
            type="number" min="0" max="99"
            class="score-input"
            [class.score-dirty]="dirty"
            [class.score-played]="match.played && !dirty"
            [value]="homeValue"
            (input)="onHome($any($event.target).value)"
            placeholder="—"
          />
          <span class="score-separator">-</span>
          <input
            type="number" min="0" max="99"
            class="score-input"
            [class.score-dirty]="dirty"
            [class.score-played]="match.played && !dirty"
            [value]="awayValue"
            (input)="onAway($any($event.target).value)"
            placeholder="—"
          />
        }
      </div>
      <span class="team-name team-away">{{ match.awayTeam.name }}</span>
    </div>
  `
})
export class MatchRowComponent {
  @Input({ required: true }) match!: TournamentMatch;
  @Input() editingHome: number | null = null;
  @Input() editingAway: number | null = null;
  @Input() dirty = false;
  @Input() readOnly = false;
  @Output() homeChange = new EventEmitter<string>();
  @Output() awayChange = new EventEmitter<string>();

  get homeValue() { return this.dirty ? this.editingHome : this.match.homeScore; }
  get awayValue() { return this.dirty ? this.editingAway : this.match.awayScore; }

  onHome(v: string) { this.homeChange.emit(v); }
  onAway(v: string) { this.awayChange.emit(v); }
}
