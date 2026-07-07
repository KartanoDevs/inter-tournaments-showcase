import {
  Component, inject, OnInit, signal, computed, ViewChild, TemplateRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TournamentService } from '../../../shared/services/tournament.service';
import { Tournament, Tournament4v4Team, TournamentMatch, TournamentGroup, TournamentPhase, TournamentStandings, StandingRow, TournamentBackup } from '../../../shared/models/tournament.model';
import { DialogService } from '../../../shared/services/dialog.service';
import { MatchRowComponent } from './match-row.component';
import { StandingsTableComponent } from './standings-table.component';
import { NeonPaginatorComponent } from '../../../shared/components/neon-paginator/neon-paginator';

@Component({
  selector: 'app-admin-tournaments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, ToastModule, TooltipModule, InputTextModule, MatchRowComponent, StandingsTableComponent, NeonPaginatorComponent],
  templateUrl: './admin-tournaments.html',
  styleUrl: './admin-tournaments.css',
  providers: [MessageService]
})
export class AdminTournaments implements OnInit {
  private svc = inject(TournamentService);
  private dialogSvc = inject(DialogService);
  private msg = inject(MessageService);

  @ViewChild('tournamentFormTpl') tournamentFormTpl!: TemplateRef<any>;

  readonly MAX_TOURNAMENTS = 1;
  tournaments = signal<Tournament[]>([]);
  isLoading = signal(true);
  selectedTournament = signal<Tournament | null>(null);

  // Form estado
  formName = signal('');
  formDate = signal<Date | null>(null);
  formIsActive = signal(false);
  editingId = signal<string | null>(null);

  // Añadir equipo
  newTeamName = signal('');
  addingTeam = signal(false);

  // Confirmación re-sorteo
  confirmUndoVisible = signal(false);
  sortingInProgress = signal(false);

  // Confirmación de borrado
  confirmDeleteVisible = signal(false);
  tournamentToDelete = signal<Tournament | null>(null);

  // Scores locales (celda en edición): key = matchId
  editingScores = signal<Record<string, { home: number | null; away: number | null }>>({});

  // Clasificación del torneo en detalle
  standings = signal<TournamentStandings | null>(null);
  savingScores = signal(false);
  generatingKnockout = signal(false);

  // Módulo de Seguridad
  backups = signal<TournamentBackup[]>([]);
  loadingBackups = signal(false);
  backupsPaginatorFirst = signal(0);
  backupsPaginatorRows = signal(10);
  pagedBackups = computed(() =>
    this.backups().slice(this.backupsPaginatorFirst(), this.backupsPaginatorFirst() + this.backupsPaginatorRows())
  );
  restoringBackup = signal(false);
  restoreConfirmVisible = signal(false);
  backupToRestore = signal<TournamentBackup | null>(null);
  restoreConfirmText = signal('');
  creatingManualBackup = signal(false);

  canRestore = computed(() => this.restoreConfirmText() === 'RESTAURAR');
  canCreateTournament = computed(() => this.tournaments().length < this.MAX_TOURNAMENTS);

  /** QR del calendario, precalculado una vez al iniciar (URL fija) para que openSchedule sea 100 % síncrono. */
  private scheduleQrDataUrl = '';

  onBackupsPageChange(event: { first: number; rows: number }) {
    this.backupsPaginatorFirst.set(event.first);
    this.backupsPaginatorRows.set(event.rows);
  }

  ngOnInit() {
    this.loadTournaments();
    void this.precomputeScheduleQr();
  }

  private async precomputeScheduleQr(): Promise<void> {
    try {
      const mod = await import('qrcode');
      // esbuild (producción) envuelve módulos CJS y pone sus exports bajo .default;
      // en dev el bundler los expone directamente en el namespace → manejamos ambos casos.
      const QRCode = (mod as any).default ?? mod;
      this.scheduleQrDataUrl = await QRCode.toDataURL('https://cvinter.duckdns.org/torneos', {
        width: 240,
        margin: 1,
        color: { dark: '#090B14', light: '#FFFFFF' }
      });
    } catch {
      this.scheduleQrDataUrl = ''; // Si falla, el horario se abre igualmente sin QR
    }
  }

  loadTournaments() {
    this.isLoading.set(true);
    this.svc.getAll().subscribe({
      next: res => { this.tournaments.set(res.data); this.isLoading.set(false); },
      error: () => { this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los torneos' }); this.isLoading.set(false); }
    });
  }

  openNew() {
    this.editingId.set(null);
    this.formName.set('');
    this.formDate.set(null);
    this.formIsActive.set(false);
    this.dialogSvc.open(this.tournamentFormTpl, { title: 'NUEVO TORNEO', closeOnBackdrop: false });
  }

  editTournament(t: Tournament) {
    this.editingId.set(t.id);
    this.formName.set(t.name);
    this.formDate.set(t.date ? new Date(t.date) : null);
    this.formIsActive.set(t.isActive);
    this.dialogSvc.open(this.tournamentFormTpl, { title: 'EDITAR TORNEO', closeOnBackdrop: false });
  }

  saveForm() {
    const name = this.formName().trim();
    if (!name) { this.msg.add({ severity: 'warn', summary: 'Atención', detail: 'El nombre es obligatorio' }); return; }
    const date = this.formDate() ? this.formDate()!.toISOString() : null;

    if (this.editingId()) {
      this.svc.update(this.editingId()!, { name, date, isActive: this.formIsActive() }).subscribe({
        next: () => { this.dialogSvc.close(); this.loadTournaments(); this.msg.add({ severity: 'success', summary: 'OK', detail: 'Torneo actualizado' }); },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' })
      });
    } else {
      this.svc.create({ name, date }).subscribe({
        next: () => { this.dialogSvc.close(); this.loadTournaments(); this.msg.add({ severity: 'success', summary: 'OK', detail: 'Torneo creado' }); },
        error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear' })
      });
    }
  }

  deleteTournament(t: Tournament) {
    this.tournamentToDelete.set(t);
    this.confirmDeleteVisible.set(true);
  }

  confirmDelete() {
    const t = this.tournamentToDelete();
    if (!t) return;
    this.confirmDeleteVisible.set(false);
    this.tournamentToDelete.set(null);
    this.svc.delete(t.id).subscribe({
      next: () => { this.loadTournaments(); this.msg.add({ severity: 'success', summary: 'OK', detail: 'Torneo eliminado' }); },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' })
    });
  }

  openDetail(t: Tournament) {
    this.svc.getById(t.id).subscribe({
      next: res => {
        this.selectedTournament.set(res.data);
        this.editingScores.set({});
        this.loadStandings(t.id);
        this.loadBackups(t.id);
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el torneo' })
    });
  }

  loadStandings(tournamentId: string) {
    this.svc.getStandings(tournamentId).subscribe({
      next: res => this.standings.set(res.data),
      error: () => {}
    });
  }

  standingsForGroup(group: TournamentGroup): StandingRow[] {
    const s = this.standings();
    if (!s) return [];
    return s[group] ?? [];
  }

  backToList() {
    this.selectedTournament.set(null);
    this.standings.set(null);
  }

  refreshSelected() {
    const t = this.selectedTournament();
    if (!t) return;
    this.svc.getById(t.id).subscribe({ next: res => this.selectedTournament.set(res.data) });
  }

  onDateChange(dateStr: string) {
    this.formDate.set(dateStr ? new Date(dateStr) : null);
  }

  // ---- Gestión de equipos ----

  addTeam() {
    const name = this.newTeamName().trim();
    const t = this.selectedTournament();
    if (!name || !t) return;
    this.addingTeam.set(true);
    this.svc.addTeam(t.id, name).subscribe({
      next: team => {
        this.newTeamName.set('');
        this.addingTeam.set(false);
        this.selectedTournament.update(prev => prev ? {
          ...prev, teams: [...prev.teams, team.data]
        } : prev);
      },
      error: err => {
        this.addingTeam.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo añadir' });
      }
    });
  }

  removeTeam(team: Tournament4v4Team) {
    const t = this.selectedTournament();
    if (!t) return;
    this.svc.removeTeam(t.id, team.id).subscribe({
      next: () => {
        this.selectedTournament.update(prev => prev ? {
          ...prev, teams: prev.teams.filter(x => x.id !== team.id)
        } : prev);
      },
      error: err => this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo eliminar' })
    });
  }

  onTeamNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.addTeam();
  }

  // ---- Sorteo ----

  hasDrawn = computed(() => {
    const t = this.selectedTournament();
    return t ? t.teams.some(tm => tm.group !== null) : false;
  });

  hasPlayedMatches = computed(() => {
    const t = this.selectedTournament();
    return t ? t.matches.some(m => m.played) : false;
  });

  draw() {
    const t = this.selectedTournament();
    if (!t) return;
    this.sortingInProgress.set(true);
    this.svc.draw(t.id).subscribe({
      next: res => {
        this.sortingInProgress.set(false);
        this.selectedTournament.set(res.data);
        this.editingScores.set({});
        this.loadBackups(t.id);
        this.msg.add({ severity: 'success', summary: '¡Sorteado!', detail: 'Grupos y partidos generados' });
      },
      error: err => {
        this.sortingInProgress.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error en el sorteo' });
      }
    });
  }

  confirmUndo() { this.confirmUndoVisible.set(true); }

  undoDraw() {
    const t = this.selectedTournament();
    if (!t) return;
    this.confirmUndoVisible.set(false);
    this.svc.undoDraw(t.id).subscribe({
      next: res => {
        this.selectedTournament.set(res.data);
        this.editingScores.set({});
        this.loadBackups(t.id);
        this.msg.add({ severity: 'info', summary: 'Deshecho', detail: 'Sorteo y partidos eliminados' });
      },
      error: err => this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Error' })
    });
  }

  // ---- Lista de partidos pendientes (liga) ----

  teamsForGroup(group: TournamentGroup): Tournament4v4Team[] {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.teams.filter(tm => tm.group === group).sort((a, b) => (a.drawOrder ?? 0) - (b.drawOrder ?? 0));
  }

  pendingMatchesForGroup(group: TournamentGroup): TournamentMatch[] {
    const t = this.selectedTournament();
    if (!t) return [];
    const pending = t.matches.filter(m => m.phase === 'GROUP' && m.group === group && !m.played);
    return this.sortWithNoRepeat(pending);
  }

  playedMatchesForGroup(group: TournamentGroup): TournamentMatch[] {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.matches
      .filter(m => m.phase === 'GROUP' && m.group === group && m.played)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }

  private sortWithNoRepeat(matches: TournamentMatch[]): TournamentMatch[] {
    const remaining = [...matches];
    const result: TournamentMatch[] = [];
    let lastTeams = new Set<string>();

    while (remaining.length > 0) {
      const idx = remaining.findIndex(
        m => !lastTeams.has(m.homeTeamId) && !lastTeams.has(m.awayTeamId)
      );
      const chosen = idx !== -1 ? remaining.splice(idx, 1)[0] : remaining.splice(0, 1)[0];
      result.push(chosen);
      lastTeams = new Set([chosen.homeTeamId, chosen.awayTeamId]);
    }
    return result;
  }

  // ---- Horario imprimible por grupo ----

  /** Todos los partidos de liga del grupo, en orden de calendario (sin repetir equipos seguidos). */
  private matchesForGroupOrdered(group: TournamentGroup): TournamentMatch[] {
    const t = this.selectedTournament();
    if (!t) return [];
    const groupMatches = t.matches.filter(m => m.phase === 'GROUP' && m.group === group);
    return this.sortWithNoRepeat(groupMatches);
  }

  /** Abre una ventana con el documento imprimible del horario de un grupo.
   *  El método es 100 % síncrono: no hay await entre el clic y window.open(),
   *  por lo que la transient user activation no se pierde y la ventana se abre
   *  en primer plano tanto en local como en producción. El QR se precalcula en
   *  ngOnInit (scheduleQrDataUrl) para no necesitar async aquí. */
  openSchedule(group: TournamentGroup) {
    const t = this.selectedTournament();
    if (!t) return;

    const matches = this.matchesForGroupOrdered(group);
    if (matches.length === 0) {
      this.msg.add({ severity: 'warn', summary: 'Sin partidos', detail: `El Grupo ${group} no tiene partidos` });
      return;
    }

    const html = this.buildScheduleHtml(t, group, matches, this.scheduleQrDataUrl);

    const w = window.open('', '_blank');
    if (!w) {
      this.msg.add({ severity: 'warn', summary: 'Bloqueado', detail: 'Permite las ventanas emergentes para imprimir' });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Documento HTML autocontenido con estilo neon: logo, lista de partidos y QR. */
  private buildScheduleHtml(
    t: Tournament,
    group: TournamentGroup,
    matches: TournamentMatch[],
    qrDataUrl: string
  ): string {
    const teamName = (m: TournamentMatch, side: 'home' | 'away'): string => {
      const id = side === 'home' ? m.homeTeamId : m.awayTeamId;
      const team = t.teams.find(tm => tm.id === id);
      return this.escapeHtml(m[side === 'home' ? 'homeTeam' : 'awayTeam']?.name ?? team?.name ?? '—');
    };

    const rows = matches.map((m, idx) => `
        <div class="match">
          <span class="num">${idx + 1}</span>
          <span class="team home">${teamName(m, 'home')}</span>
          <span class="vs">VS</span>
          <span class="team away">${teamName(m, 'away')}</span>
        </div>`).join('');

    const tournamentName = this.escapeHtml(t.name ?? 'Torneo');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Partidos Grupo ${group} — ${tournamentName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-dark: #090B14;
    --bg-card: #12162D;
    --neon-cyan: #00E5FF;
    --neon-magenta: #FF00FF;
    --text-main: #FFFFFF;
    --text-muted: #8AA4C8;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: var(--bg-dark);
    color: var(--text-main);
    font-family: 'Inter', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    height: 100%;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 60px 24px 32px;
  }
  .page {
    width: 100%;
    max-width: 620px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── HEADER ─────────────────────────────────────────────── */
  header {
    text-align: center;
    padding-bottom: 18px;
    margin-bottom: 22px;
    position: relative;
  }
  header::after {
    content: '';
    display: block;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--neon-cyan), transparent);
    margin-top: 18px;
    border-radius: 2px;
  }
  header img.logo {
    width: 100px;
    height: 100px;
    object-fit: contain;
    margin-bottom: 10px;
    filter: drop-shadow(0 0 10px rgba(0,229,255,0.4));
  }
  header .tournament {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.78rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  header .title {
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    font-size: 1.75rem;
    margin: 6px 0 0;
    color: var(--neon-magenta);
    text-shadow: 0 0 10px rgba(255,0,255,0.8), 0 0 28px rgba(255,0,255,0.35);
    letter-spacing: 2px;
  }
  header .date {
    color: var(--text-muted);
    font-size: 0.75rem;
    margin-top: 4px;
    letter-spacing: 1px;
  }

  /* ── PARTIDOS ────────────────────────────────────────────── */
  .matches {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .match {
    display: grid;
    grid-template-columns: 38px 1fr 52px 1fr;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid rgba(0,229,255,0.18);
    border-radius: 8px;
    padding: 10px 14px;
    transition: border-color 0.2s;
  }
  .match:nth-child(even) { background: #0b0f22; }
  .match:hover { border-color: rgba(0,229,255,0.5); }
  .match .num {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: 0.82rem;
    color: var(--neon-cyan);
    text-align: center;
    opacity: 0.9;
  }
  .match .team {
    font-weight: 600;
    font-size: 0.92rem;
    letter-spacing: 0.3px;
  }
  .match .team.home { text-align: right; padding-right: 10px; }
  .match .team.away { text-align: left;  padding-left: 10px; }
  .match .vs {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--neon-magenta);
    text-align: center;
    opacity: 0.85;
    letter-spacing: 1px;
  }

  /* ── FOOTER / QR ─────────────────────────────────────────── */
  footer {
    margin-top: 40px;
    text-align: center;
    padding-top: 22px;
    position: relative;
  }
  footer::before {
    content: '';
    display: block;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--neon-cyan), transparent);
    margin-bottom: 22px;
    border-radius: 2px;
  }
  footer img.qr {
    width: 120px;
    height: 120px;
    border: 3px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    box-shadow: 0 0 18px rgba(0,229,255,0.4), 0 0 4px rgba(0,229,255,0.2);
  }
  footer .qr-label {
    font-family: 'Orbitron', sans-serif;
    color: var(--neon-cyan);
    margin: 10px 0 3px;
    font-size: 0.72rem;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  footer .qr-url {
    color: var(--text-muted);
    font-size: 0.65rem;
    opacity: 0.7;
  }

  @media print {
    @page {
      margin: 10mm;
      size: A4 portrait;
      @top-left   { content: none; }
      @top-center { content: none; }
      @top-right  { content: none; }
      @bottom-left   { content: none; }
      @bottom-center { content: none; }
      @bottom-right  { content: none; }
    }
    body { padding: 0; min-height: unset; display: block; }
    .page { max-width: 100%; }
    .match:hover { border-color: rgba(0,229,255,0.18); }
  }
</style>
</head>
<body>
  <div class="page">
    <header>
      <img class="logo" src="/icono.png" alt="Logo">
      <p class="tournament">${tournamentName}</p>
      <h1 class="title">PARTIDOS GRUPO ${group}</h1>
    </header>

    <div class="matches">${rows}
    </div>

    <footer>
      <img class="qr" src="${qrDataUrl}" alt="QR">
      <p class="qr-label">Escanea para seguir el torneo</p>
      <p class="qr-url">https://cvinter.duckdns.org/torneos</p>
    </footer>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body>
</html>`;
  }

  // ---- Fase eliminatoria ----

  knockoutMatches = computed(() => {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.matches.filter(m => m.phase !== 'GROUP');
  });

  allGroupMatchesPlayed = computed(() => {
    const t = this.selectedTournament();
    if (!t) return false;
    const groupMatches = t.matches.filter(m => m.phase === 'GROUP');
    return groupMatches.length > 0 && groupMatches.every(m => m.played);
  });

  hasKnockout = computed(() => this.knockoutMatches().length > 0);

  canGenerateKnockout = computed(() => {
    const t = this.selectedTournament();
    if (!t) return false;
    return this.allGroupMatchesPlayed() && !this.hasKnockout() && (t.teams.length === 8 || t.teams.length === 10);
  });

  matchesByPhase(phase: TournamentPhase): TournamentMatch[] {
    const t = this.selectedTournament();
    if (!t) return [];
    return t.matches.filter(m => m.phase === phase);
  }

  generateKnockout() {
    const t = this.selectedTournament();
    if (!t) return;
    this.generatingKnockout.set(true);
    this.svc.generateKnockout(t.id).subscribe({
      next: res => {
        this.generatingKnockout.set(false);
        this.selectedTournament.set(res.data);
        this.loadBackups(t.id);
        this.msg.add({ severity: 'success', summary: '¡Fase eliminatoria generada!', detail: 'Se han creado los cuartos de final' });
      },
      error: err => {
        this.generatingKnockout.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo generar la fase eliminatoria' });
      }
    });
  }

  // ---- Scores ----

  matchForPair(rowTeamId: string, colTeamId: string): TournamentMatch | undefined {
    const t = this.selectedTournament();
    if (!t) return undefined;
    return t.matches.find(m =>
      (m.homeTeamId === rowTeamId && m.awayTeamId === colTeamId) ||
      (m.homeTeamId === colTeamId && m.awayTeamId === rowTeamId)
    );
  }

  getScore(match: TournamentMatch, rowTeamId: string): number | null {
    if (match.homeTeamId === rowTeamId) return match.homeScore;
    return match.awayScore;
  }

  getEditingScore(matchId: string, isHome: boolean): number | null {
    const scores = this.editingScores();
    const entry = scores[matchId];
    if (!entry) return null;
    return isHome ? entry.home : entry.away;
  }

  onScoreChange(match: TournamentMatch, teamId: string, value: string) {
    const num = value === '' ? null : parseInt(value, 10);
    const isHome = match.homeTeamId === teamId;
    const current = this.editingScores()[match.id] ?? { home: match.homeScore, away: match.awayScore };
    const updated = isHome ? { ...current, home: num } : { ...current, away: num };
    this.editingScores.update(s => ({ ...s, [match.id]: updated }));
  }

  hasUnsavedScore(matchId: string): boolean {
    return !!this.editingScores()[matchId];
  }

  hasPendingScores = computed(() => Object.keys(this.editingScores()).length > 0);

  saveAllScores() {
    const t = this.selectedTournament();
    if (!t) return;
    const pending = Object.entries(this.editingScores());
    if (!pending.length) return;

    this.savingScores.set(true);
    let completed = 0;
    let hasError = false;

    for (const [matchId, scores] of pending) {
      this.svc.updateMatch(t.id, matchId, { homeScore: scores.home, awayScore: scores.away }).subscribe({
        next: res => {
          this.selectedTournament.update(prev => {
            if (!prev) return prev;
            return { ...prev, matches: prev.matches.map(m => m.id === matchId ? res.data : m) };
          });
          this.editingScores.update(s => { const c = { ...s }; delete c[matchId]; return c; });
          completed++;
          if (completed === pending.length) {
            this.savingScores.set(false);
            if (!hasError) {
              this.msg.add({ severity: 'success', summary: 'Guardado', detail: 'Puntuaciones actualizadas' });
              this.loadStandings(t.id);
              this.loadBackups(t.id);
              // Refrescar para obtener posibles nuevos partidos de eliminatoria generados por advanceKnockout
              this.svc.getById(t.id).subscribe({ next: r => this.selectedTournament.set(r.data) });
            }
          }
        },
        error: () => {
          hasError = true;
          completed++;
          this.savingScores.set(false);
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar alguna puntuación' });
        }
      });
    }
  }

  tournamentStatus(t: Tournament): string {
    const teams = t.teams ?? [];
    const matches = t.matches ?? [];
    if (!teams.some(tm => tm.group)) return 'Sin sortear';
    if (matches.some(m => m.played)) return 'En juego';
    return 'Sorteado';
  }

  // ---- Módulo de Seguridad ----

  loadBackups(tournamentId: string) {
    this.loadingBackups.set(true);
    this.svc.listBackups(tournamentId).subscribe({
      next: res => { this.backups.set(res.data); this.loadingBackups.set(false); },
      error: () => { this.loadingBackups.set(false); }
    });
  }

  createManualBackup() {
    const t = this.selectedTournament();
    if (!t) return;
    this.creatingManualBackup.set(true);
    this.svc.createManualBackup(t.id).subscribe({
      next: () => {
        this.creatingManualBackup.set(false);
        this.loadBackups(t.id);
        this.msg.add({ severity: 'success', summary: 'Snapshot creado', detail: 'Snapshot manual guardado' });
      },
      error: () => {
        this.creatingManualBackup.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el snapshot' });
      }
    });
  }

  openRestoreConfirm(backup: TournamentBackup) {
    this.backupToRestore.set(backup);
    this.restoreConfirmText.set('');
    this.restoreConfirmVisible.set(true);
  }

  confirmRestore() {
    const t = this.selectedTournament();
    const backup = this.backupToRestore();
    if (!t || !backup || !this.canRestore()) return;
    this.restoringBackup.set(true);
    this.svc.restore(t.id, backup.filename).subscribe({
      next: res => {
        this.restoringBackup.set(false);
        this.restoreConfirmVisible.set(false);
        this.backupToRestore.set(null);
        this.selectedTournament.set(res.data);
        this.editingScores.set({});
        this.loadStandings(t.id);
        this.loadBackups(t.id);
        this.msg.add({ severity: 'success', summary: 'Restaurado', detail: 'Torneo restaurado al snapshot seleccionado' });
      },
      error: err => {
        this.restoringBackup.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo restaurar' });
      }
    });
  }

  deleteBackupFile(backup: TournamentBackup) {
    const t = this.selectedTournament();
    if (!t) return;
    this.svc.deleteBackup(t.id, backup.filename).subscribe({
      next: () => { this.loadBackups(t.id); },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el snapshot' })
    });
  }

  downloadBackupFile(backup: TournamentBackup) {
    const t = this.selectedTournament();
    if (!t) return;
    this.svc.downloadBackup(t.id, backup.filename).subscribe({
      next: blob => this.triggerDownload(blob, backup.filename),
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo descargar el snapshot' })
    });
  }

  downloadCsvFile() {
    const t = this.selectedTournament();
    if (!t) return;
    this.svc.downloadCsv(t.id).subscribe({
      next: blob => this.triggerDownload(blob, `torneo-${t.id}.csv`),
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No hay datos CSV disponibles' })
    });
  }

  downloadXlsxFile() {
    const t = this.selectedTournament();
    if (!t) return;
    const safeName = t.name.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    this.svc.downloadXlsx(t.id).subscribe({
      next: blob => this.triggerDownload(blob, `torneo-${safeName}.xlsx`),
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el Excel' })
    });
  }

  onBackupFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const t = this.selectedTournament();
    if (!file || !t) return;
    input.value = '';
    this.svc.uploadBackup(t.id, file).subscribe({
      next: res => {
        this.selectedTournament.set(res.data);
        this.editingScores.set({});
        this.loadStandings(t.id);
        this.loadBackups(t.id);
        this.msg.add({ severity: 'success', summary: 'Restaurado', detail: 'Torneo restaurado desde el fichero subido' });
      },
      error: err => this.msg.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'No se pudo restaurar el fichero' })
    });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
