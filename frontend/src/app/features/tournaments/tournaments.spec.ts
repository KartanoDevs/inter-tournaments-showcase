import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Tournaments } from './tournaments';
import { TournamentService } from '../../shared/services/tournament.service';
import {
  Tournament, Tournament4v4Team, TournamentMatch, TournamentStandings
} from '../../shared/models/tournament.model';

// =====================================================================
//  FACTORIES
// =====================================================================

function makeTeam(o: Partial<Tournament4v4Team> = {}): Tournament4v4Team {
  return {
    id: 'team-1', name: 'A', group: null, drawOrder: null,
    tournamentId: 'trn-1', createdAt: '2026-01-01T00:00:00.000Z', ...o
  };
}

function makeMatch(o: Partial<TournamentMatch> = {}): TournamentMatch {
  const home = makeTeam({ id: 'team-1', name: 'Local' });
  const away = makeTeam({ id: 'team-2', name: 'Visita' });
  return {
    id: 'm-1', tournamentId: 'trn-1', phase: 'GROUP', group: 'A',
    homeTeamId: home.id, awayTeamId: away.id,
    homeTeam: home, awayTeam: away,
    homeScore: null, awayScore: null, played: false,
    updatedAt: '2026-01-01T00:00:00.000Z', ...o
  };
}

function makeTournament(o: Partial<Tournament> = {}): Tournament {
  return {
    id: 'trn-1', name: 'Torneo', date: null,
    isActive: true, isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    teams: [], matches: [], ...o
  };
}

function makeStandings(): TournamentStandings {
  return {
    A: [
      { teamId: 'team-1', teamName: 'A', group: 'A', played: 1, wins: 1, pf: 21, pc: 15, total: 6 },
      { teamId: 'team-2', teamName: 'B', group: 'A', played: 1, wins: 0, pf: 15, pc: 21, total: -6 }
    ],
    B: []
  };
}

type SvcMock = {
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  getStandings: ReturnType<typeof vi.fn>;
};

function makeSvcMock(): SvcMock {
  return {
    getAll: vi.fn().mockReturnValue(of({ status: 'success', data: [] })),
    getById: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    getStandings: vi.fn().mockReturnValue(of({ status: 'success', data: makeStandings() }))
  };
}

describe('Tournaments', () => {
  let component: Tournaments;
  let fixture: ComponentFixture<Tournaments>;
  let svc: SvcMock;

  async function setup(autoDetect = true) {
    await TestBed.configureTestingModule({
      imports: [Tournaments],
      providers: [{ provide: TournamentService, useValue: svc }]
    }).compileComponents();
    fixture = TestBed.createComponent(Tournaments);
    component = fixture.componentInstance;
    if (autoDetect) fixture.detectChanges();
  }

  beforeEach(() => {
    svc = makeSvcMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ------------------------------------------------------------
  //  loadList
  // ------------------------------------------------------------
  describe('loadList', () => {
    it('filtra solo isActive=true', async () => {
      svc.getAll.mockReturnValue(of({
        status: 'success',
        data: [
          makeTournament({ id: 'a', isActive: true }),
          makeTournament({ id: 'b', isActive: false })
        ]
      }));
      await setup();
      expect(component.tournaments().map(t => t.id)).toEqual(['a']);
      expect(component.isLoading()).toBe(false);
    });

    it('con 1 torneo activo abre detalle automáticamente', async () => {
      const t = makeTournament({ id: 'only', isActive: true });
      svc.getAll.mockReturnValue(of({ status: 'success', data: [t] }));
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      await setup();
      expect(svc.getById).toHaveBeenCalledWith('only');
      expect(component.selectedTournament()?.id).toBe('only');
    });

    it('con varios torneos activos NO auto-abre', async () => {
      svc.getAll.mockReturnValue(of({
        status: 'success',
        data: [
          makeTournament({ id: 'a', isActive: true }),
          makeTournament({ id: 'b', isActive: true })
        ]
      }));
      await setup();
      expect(svc.getById).not.toHaveBeenCalled();
      expect(component.selectedTournament()).toBeNull();
    });

    it('en error termina loading sin tirar', async () => {
      svc.getAll.mockReturnValue(throwError(() => new Error('boom')));
      await setup();
      expect(component.isLoading()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  openTournament
  // ------------------------------------------------------------
  describe('openTournament', () => {
    beforeEach(async () => { await setup(); });

    it('en éxito setea selectedTournament y standings', () => {
      const t = makeTournament({ id: 'trn-2' });
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      component.openTournament(t);
      expect(component.selectedTournament()).toEqual(t);
      expect(component.standings()).toEqual(makeStandings());
      expect(component.detailLoading()).toBe(false);
    });

    it('si getById falla, detailLoading vuelve a false', () => {
      svc.getById.mockReturnValue(throwError(() => new Error('boom')));
      component.openTournament(makeTournament());
      expect(component.detailLoading()).toBe(false);
    });

    it('si getStandings falla, detailLoading vuelve a false', () => {
      svc.getStandings.mockReturnValue(throwError(() => new Error('boom')));
      component.openTournament(makeTournament());
      expect(component.detailLoading()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  backToList
  // ------------------------------------------------------------
  describe('backToList', () => {
    beforeEach(async () => { await setup(); });

    it('limpia selected, standings, resetea activeGroupTab', () => {
      component.selectedTournament.set(makeTournament());
      component.standings.set(makeStandings());
      component.activeGroupTab.set('B');
      component.backToList();
      expect(component.selectedTournament()).toBeNull();
      expect(component.standings()).toBeNull();
      expect(component.activeGroupTab()).toBe('A');
    });
  });

  // ------------------------------------------------------------
  //  Polling
  // ------------------------------------------------------------
  describe('polling', () => {
    beforeEach(async () => {
      vi.useFakeTimers();
      await setup();
    });

    it('tras openTournament, cada 5s refresca si la pestaña está visible', () => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      const t = makeTournament({ id: 'trn-1' });
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      component.openTournament(t);
      svc.getById.mockClear();
      svc.getStandings.mockClear();

      vi.advanceTimersByTime(5000);
      expect(svc.getById).toHaveBeenCalledWith('trn-1');
      expect(svc.getStandings).toHaveBeenCalledWith('trn-1');
    });

    it('no refresca si la pestaña está oculta', () => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      const t = makeTournament({ id: 'trn-1' });
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      component.openTournament(t);
      svc.getById.mockClear();

      vi.advanceTimersByTime(5000);
      expect(svc.getById).not.toHaveBeenCalled();
    });

    it('backToList detiene el polling', () => {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      const t = makeTournament({ id: 'trn-1' });
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      component.openTournament(t);
      component.backToList();
      svc.getById.mockClear();

      vi.advanceTimersByTime(10000);
      expect(svc.getById).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  //  refreshSelectedSilently
  // ------------------------------------------------------------
  describe('refresh silencioso', () => {
    beforeEach(async () => { await setup(); });

    it('actualiza selectedTournament solo si el JSON difiere', () => {
      const t = makeTournament({ id: 'trn-1' });
      component.selectedTournament.set(t);
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      const original = component.selectedTournament();
      (component as any).refreshSelectedSilently('trn-1');
      // Igual contenido → no debería reemplazar la referencia
      expect(component.selectedTournament()).toBe(original);
    });

    it('reemplaza referencia cuando el contenido difiere', () => {
      const t = makeTournament({ id: 'trn-1', name: 'antes' });
      component.selectedTournament.set(t);
      const newer = makeTournament({ id: 'trn-1', name: 'despues' });
      svc.getById.mockReturnValue(of({ status: 'success', data: newer }));
      (component as any).refreshSelectedSilently('trn-1');
      expect(component.selectedTournament()?.name).toBe('despues');
    });

    it('tolera error de getById silenciosamente', () => {
      const t = makeTournament();
      component.selectedTournament.set(t);
      svc.getById.mockReturnValue(throwError(() => new Error('boom')));
      expect(() => (component as any).refreshSelectedSilently('trn-1')).not.toThrow();
    });

    it('tolera error de getStandings silenciosamente', () => {
      svc.getStandings.mockReturnValue(throwError(() => new Error('boom')));
      expect(() => (component as any).refreshSelectedSilently('trn-1')).not.toThrow();
    });
  });

  // ------------------------------------------------------------
  //  setActiveTab
  // ------------------------------------------------------------
  describe('setActiveTab', () => {
    beforeEach(async () => { await setup(); });

    it('actualiza el signal', () => {
      component.setActiveTab('B');
      expect(component.activeGroupTab()).toBe('B');
    });
  });

  // ------------------------------------------------------------
  //  Filtros por grupo
  // ------------------------------------------------------------
  describe('standingsForGroup', () => {
    beforeEach(async () => { await setup(); });

    it('sin standings devuelve []', () => {
      component.standings.set(null);
      expect(component.standingsForGroup('A')).toEqual([]);
    });

    it('devuelve filas del grupo solicitado', () => {
      component.standings.set(makeStandings());
      expect(component.standingsForGroup('A').length).toBe(2);
      expect(component.standingsForGroup('B')).toEqual([]);
    });
  });

  describe('playedMatchesForGroup', () => {
    beforeEach(async () => { await setup(); });

    it('sin torneo devuelve []', () => {
      component.selectedTournament.set(null);
      expect(component.playedMatchesForGroup('A')).toEqual([]);
    });

    it('filtra GROUP+grupo+played y ordena por updatedAt asc', () => {
      const m1 = makeMatch({ id: 'm-1', played: true, group: 'A', updatedAt: '2026-02-05T00:00:00.000Z' });
      const m2 = makeMatch({ id: 'm-2', played: true, group: 'A', updatedAt: '2026-01-01T00:00:00.000Z' });
      const m3 = makeMatch({ id: 'm-3', played: false, group: 'A' });
      const m4 = makeMatch({ id: 'm-4', played: true, group: 'B' });
      const m5 = makeMatch({ id: 'm-5', played: true, group: 'A', phase: 'QF' });
      component.selectedTournament.set(makeTournament({ matches: [m1, m2, m3, m4, m5] }));
      expect(component.playedMatchesForGroup('A').map(m => m.id)).toEqual(['m-2', 'm-1']);
    });
  });

  // ------------------------------------------------------------
  //  Computeds
  // ------------------------------------------------------------
  describe('computeds', () => {
    beforeEach(async () => { await setup(); });

    it('hasDrawn=true si algún equipo tiene group', () => {
      component.selectedTournament.set(makeTournament({
        teams: [makeTeam({ group: null }), makeTeam({ group: 'A' })]
      }));
      expect(component.hasDrawn()).toBe(true);
    });

    it('hasDrawn=false sin torneo', () => {
      component.selectedTournament.set(null);
      expect(component.hasDrawn()).toBe(false);
    });

    it('upcomingGroupMatches intercala A/B hasta 4', () => {
      const matches = [
        makeMatch({ id: 'a1', group: 'A', phase: 'GROUP', played: false }),
        makeMatch({ id: 'a2', group: 'A', phase: 'GROUP', played: false }),
        makeMatch({ id: 'a3', group: 'A', phase: 'GROUP', played: false }),
        makeMatch({ id: 'b1', group: 'B', phase: 'GROUP', played: false }),
        makeMatch({ id: 'b2', group: 'B', phase: 'GROUP', played: false })
      ];
      component.selectedTournament.set(makeTournament({ matches }));
      const result = component.upcomingGroupMatches();
      expect(result.length).toBe(4);
      expect(result.map(m => m.id)).toEqual(['a1', 'b1', 'a2', 'b2']);
    });

    it('upcomingGroupMatches respeta cap de 4 incluso con muchos pendientes', () => {
      const matches = Array.from({ length: 6 }, (_, i) =>
        makeMatch({ id: `a${i}`, group: 'A', phase: 'GROUP', played: false })
      );
      component.selectedTournament.set(makeTournament({ matches }));
      expect(component.upcomingGroupMatches().length).toBe(4);
    });

    it('upcomingGroupMatches sin torneo devuelve []', () => {
      component.selectedTournament.set(null);
      expect(component.upcomingGroupMatches()).toEqual([]);
    });

    it('knockoutMatches filtra fases != GROUP', () => {
      component.selectedTournament.set(makeTournament({
        matches: [
          makeMatch({ id: 'g', phase: 'GROUP' }),
          makeMatch({ id: 'q', phase: 'QF' }),
          makeMatch({ id: 'f', phase: 'FINAL' })
        ]
      }));
      expect(component.knockoutMatches().map(m => m.id)).toEqual(['q', 'f']);
    });

    it('hasKnockout refleja knockoutMatches.length', () => {
      component.selectedTournament.set(makeTournament({ matches: [makeMatch({ phase: 'SF' })] }));
      expect(component.hasKnockout()).toBe(true);

      component.selectedTournament.set(makeTournament({ matches: [makeMatch({ phase: 'GROUP' })] }));
      expect(component.hasKnockout()).toBe(false);
    });

    it('showBackButton true cuando hay más de 1 torneo', () => {
      svc.getAll.mockReturnValue(of({
        status: 'success',
        data: [
          makeTournament({ id: 'a', isActive: true }),
          makeTournament({ id: 'b', isActive: true })
        ]
      }));
      component.loadList();
      expect(component.showBackButton()).toBe(true);
    });

    it('showBackButton false con 1 torneo', () => {
      expect(component.showBackButton()).toBe(false);
    });
  });
});
