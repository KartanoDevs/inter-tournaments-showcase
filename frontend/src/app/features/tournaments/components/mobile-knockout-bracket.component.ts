import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TournamentMatch, TournamentPhase } from '../../../shared/models/tournament.model';
import { MobileMatchRowComponent } from './mobile-match-row.component';

@Component({
  selector: 'app-tournaments-knockout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MobileMatchRowComponent],
  styles: [`
    :host { display: block; }

    .bracket {
      border: 1px solid rgba(255, 0, 255, 0.25);
      border-radius: 8px;
      padding: 0.85rem;
      background: rgba(255, 0, 255, 0.03);
    }
    .bracket-title {
      font-family: 'Orbitron', sans-serif;
      color: var(--neon-magenta, #ff00ff);
      text-shadow: 0 0 6px var(--neon-magenta, #ff00ff);
      letter-spacing: 2px;
      text-align: center;
      margin: 0 0 0.85rem;
      font-size: clamp(0.95rem, 2.8vw, 1.2rem);
    }

    .phase-block { margin-bottom: 0.85rem; }
    .phase-block:last-child { margin-bottom: 0; }

    .phase-title {
      font-family: 'Orbitron', sans-serif;
      color: var(--neon-cyan, #00e5ff);
      text-shadow: 0 0 4px rgba(0, 229, 255, 0.5);
      letter-spacing: 1.5px;
      font-size: clamp(0.78rem, 2.4vw, 0.95rem);
      margin: 0 0 0.5rem;
    }
    .phase-title.final-title {
      color: var(--neon-magenta, #ff00ff);
      text-shadow: 0 0 6px var(--neon-magenta, #ff00ff);
    }

    .match-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
  `],
  template: `
    <div class="bracket">
      <h3 class="bracket-title">Fase eliminatoria</h3>

      @let final = byPhase('FINAL');
      @if (final.length > 0) {
        <div class="phase-block">
          <h4 class="phase-title final-title">Final</h4>
          <div class="match-list">
            @for (m of final; track m.id) {
              <app-tournaments-match-row [match]="m" />
            }
          </div>
        </div>
      }

      @let third = byPhase('THIRD');
      @if (third.length > 0) {
        <div class="phase-block">
          <h4 class="phase-title">3º y 4º puesto</h4>
          <div class="match-list">
            @for (m of third; track m.id) {
              <app-tournaments-match-row [match]="m" />
            }
          </div>
        </div>
      }

      @let sf = byPhase('SF');
      @if (sf.length > 0) {
        <div class="phase-block">
          <h4 class="phase-title">Semifinales</h4>
          <div class="match-list">
            @for (m of sf; track m.id) {
              <app-tournaments-match-row [match]="m" />
            }
          </div>
        </div>
      }

      @let qf = byPhase('QF');
      @if (qf.length > 0) {
        <div class="phase-block">
          <h4 class="phase-title">Cuartos de final</h4>
          <div class="match-list">
            @for (m of qf; track m.id) {
              <app-tournaments-match-row [match]="m" />
            }
          </div>
        </div>
      }
    </div>
  `
})
export class MobileKnockoutBracketComponent {
  @Input({ required: true }) matches: TournamentMatch[] = [];

  byPhase(phase: TournamentPhase): TournamentMatch[] {
    return this.matches.filter(m => m.phase === phase);
  }
}
