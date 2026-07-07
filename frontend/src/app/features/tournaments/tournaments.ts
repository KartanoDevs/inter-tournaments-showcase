import {
  Component, inject, OnInit, signal, computed, ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription, fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { TournamentService } from '../../shared/services/tournament.service';
import {
  Tournament, TournamentMatch, TournamentGroup, TournamentStandings, StandingRow
} from '../../shared/models/tournament.model';
import { MobileMatchRowComponent } from './components/mobile-match-row.component';
import { MobileStandingsTableComponent } from './components/mobile-standings-table.component';
import { MobileKnockoutBracketComponent } from './components/mobile-knockout-bracket.component';

@Component({
  selector: 'app-tournaments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MobileMatchRowComponent,
    MobileStandingsTableComponent,
    MobileKnockoutBracketComponent
  ],
  templateUrl: './tournaments.html',
  styleUrl: './tournaments.css'
})
export class Tournaments implements OnInit {
  private svc = inject(TournamentService);
  private destroyRef = inject(DestroyRef);
  private readonly POLL_INTERVAL_MS = 5000;
  private pollSub: Subscription | null = null;

  tournaments = signal<Tournament[]>([]);
  selectedTournament = signal<Tournament | null>(null);
  standings = signal<TournamentStandings | null>(null);
  isLoading = signal(true);
  detailLoading = signal(false);
  activeGroupTab = signal<TournamentGroup>('A');

  ngOnInit() { this.loadList(); }

  loadList() {
    this.isLoading.set(true);
    this.svc.getAll().subscribe({
      next: res => {
        const active = res.data.filter(t => t.isActive);
        this.tournaments.set(active);
        this.isLoading.set(false);
        if (active.length === 1) {
          this.openTournament(active[0]);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  openTournament(t: Tournament) {
    this.detailLoading.set(true);
    this.svc.getById(t.id).subscribe({
      next: res => {
        this.selectedTournament.set(res.data);
        this.svc.getStandings(t.id).subscribe({
          next: s => {
            this.standings.set(s.data);
            this.detailLoading.set(false);
            this.startPolling(t.id);
          },
          error: () => this.detailLoading.set(false)
        });
      },
      error: () => this.detailLoading.set(false)
    });
  }

  backToList() {
    this.stopPolling();
    this.selectedTournament.set(null);
    this.standings.set(null);
    this.activeGroupTab.set('A');
  }

  private refreshSelectedSilently(tournamentId: string) {
    this.svc.getById(tournamentId).subscribe({
      next: res => {
        const prev = this.selectedTournament();
        if (!prev || JSON.stringify(prev) !== JSON.stringify(res.data)) {
          this.selectedTournament.set(res.data);
        }
      },
      error: () => {}
    });
    this.svc.getStandings(tournamentId).subscribe({
      next: s => {
        const prev = this.standings();
        if (!prev || JSON.stringify(prev) !== JSON.stringify(s.data)) {
          this.standings.set(s.data);
        }
      },
      error: () => {}
    });
  }

  private startPolling(tournamentId: string) {
    this.stopPolling();
    this.pollSub = interval(this.POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible') {
          this.refreshSelectedSilently(tournamentId);
        }
      });

    fromEvent(document, 'visibilitychange')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => document.visibilityState === 'visible' && this.selectedTournament()?.id === tournamentId)
      )
      .subscribe(() => this.refreshSelectedSilently(tournamentId));
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  setActiveTab(group: TournamentGroup) {
    this.activeGroupTab.set(group);
  }

  standingsForGroup(group: TournamentGroup): StandingRow[] {
    const s = this.standings();
    if (!s) return [];
    return s[group] ?? [];
  }

  playedMatchesForGroup(group: TournamentGroup): TournamentMatch[] {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.matches
      .filter(m => m.phase === 'GROUP' && m.group === group && m.played)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }

  hasDrawn = computed(() => {
    const t = this.selectedTournament();
    return t ? t.teams.some(tm => tm.group !== null) : false;
  });

  upcomingGroupMatches = computed<TournamentMatch[]>(() => {
    const t = this.selectedTournament();
    if (!t) return [];
    const queueA = t.matches.filter(m => m.phase === 'GROUP' && m.group === 'A' && !m.played);
    const queueB = t.matches.filter(m => m.phase === 'GROUP' && m.group === 'B' && !m.played);
    const result: TournamentMatch[] = [];
    const max = 4;
    let i = 0;
    while (result.length < max && (queueA[i] || queueB[i])) {
      if (queueA[i]) result.push(queueA[i]);
      if (result.length < max && queueB[i]) result.push(queueB[i]);
      i++;
    }
    return result;
  });

  knockoutMatches = computed<TournamentMatch[]>(() => {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.matches.filter(m => m.phase !== 'GROUP');
  });

  hasKnockout = computed(() => this.knockoutMatches().length > 0);

  showBackButton = computed(() => this.tournaments().length > 1);
}
