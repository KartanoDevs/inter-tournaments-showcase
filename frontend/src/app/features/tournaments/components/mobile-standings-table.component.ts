import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StandingRow } from '../../../shared/models/tournament.model';

@Component({
  selector: 'app-tournaments-standings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }

    .standings-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
    }

    .standings-table {
      border-collapse: collapse;
      width: 100%;
      font-size: clamp(0.7rem, 2vw, 0.85rem);
    }
    .standings-table thead tr {
      background: rgba(0, 0, 0, 0.4);
    }
    .standings-table th {
      color: var(--neon-cyan, #00e5ff);
      font-weight: bold;
      padding: 5px 4px;
      border-bottom: 1px solid rgba(0, 229, 255, 0.4);
      text-align: center;
      text-transform: uppercase;
      font-size: 0.65rem;
      white-space: nowrap;
    }
    .standings-table td {
      padding: 6px 4px;
      border-bottom: 1px solid rgba(0, 229, 255, 0.1);
      color: #e0e6ed;
      text-align: center;
    }
    .standings-table tr:last-child td {
      border-bottom: none;
    }
    .standings-table .team-name-cell {
      text-align: center;
      min-width: 0;
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      width: 100%;
    }
    .standings-table tr.top-row td {
      color: var(--neon-cyan, #00e5ff);
      font-weight: bold;
      text-shadow: 0 0 5px rgba(0, 229, 255, 0.4);
    }
    .standings-table .wins { color: #00ffaa; font-weight: bold; }
    .standings-table .positive { color: #00ffaa; }
    .standings-table .negative { color: var(--neon-magenta, #ff00ff); }

    /* Por defecto (móvil): ocultar PF y PC para que la tabla quepa */
    .col-pf, .col-pc { display: none; }

    @media (min-width: 600px) {
      .col-pf, .col-pc { display: table-cell; }
      .standings-table th { font-size: 0.72rem; padding: 7px 6px; }
      .standings-table td { padding: 8px 6px; }
    }

    .empty {
      text-align: center;
      color: var(--text-muted, #8a8e99);
      font-size: 0.85rem;
      padding: 0.5rem 0;
    }
  `],
  template: `
    @if (rows.length === 0) {
      <p class="empty">Sin clasificación todavía.</p>
    } @else {
      <div class="standings-wrapper">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="team-name-cell">Equipo</th>
              <th title="Partidos jugados">PJ</th>
              <th>V</th>
              <th class="col-pf">PF</th>
              <th class="col-pc">PC</th>
              <th>Dif.</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.teamId; let i = $index) {
              <tr [class.top-row]="i === 0">
                <td>{{ i + 1 }}</td>
                <td class="team-name-cell">{{ row.teamName }}</td>
                <td>{{ row.played }}</td>
                <td class="wins">{{ row.wins }}</td>
                <td class="col-pf">{{ row.pf }}</td>
                <td class="col-pc">{{ row.pc }}</td>
                <td [class.positive]="row.total > 0" [class.negative]="row.total < 0">
                  {{ row.total > 0 ? '+' : '' }}{{ row.total }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class MobileStandingsTableComponent {
  @Input({ required: true }) rows: StandingRow[] = [];
}
