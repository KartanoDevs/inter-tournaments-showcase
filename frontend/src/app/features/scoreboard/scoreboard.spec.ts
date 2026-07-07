import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { Scoreboard } from './scoreboard';
import { TournamentService } from '../../shared/services/tournament.service';
import { Tournament, Tournament4v4Team } from '../../shared/models/tournament.model';

// =====================================================================
//  FACTORIES
// =====================================================================

function makeTeam(overrides: Partial<Tournament4v4Team> = {}): Tournament4v4Team {
  return {
    id: 'team-1',
    name: 'Equipo',
    group: null,
    drawOrder: null,
    tournamentId: 'trn-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'trn-1',
    name: 'Torneo',
    date: null,
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    teams: [],
    matches: [],
    ...overrides
  };
}

// =====================================================================
//  SUITE
// =====================================================================

describe('Scoreboard', () => {
  let component: Scoreboard;
  let fixture: ComponentFixture<Scoreboard>;
  let svcMock: { getAll: ReturnType<typeof vi.fn> };

  async function setup(getAllResult: 'empty' | 'active' | 'error' = 'empty') {
    if (getAllResult === 'empty') {
      svcMock.getAll.mockReturnValue(of({ status: 'success', data: [] }));
    } else if (getAllResult === 'active') {
      svcMock.getAll.mockReturnValue(of({
        status: 'success',
        data: [makeTournament({
          isActive: true,
          teams: [makeTeam({ id: 'team-1', name: 'A' }), makeTeam({ id: 'team-2', name: 'B' })]
        })]
      }));
    } else {
      svcMock.getAll.mockReturnValue(throwError(() => new Error('boom')));
    }

    await TestBed.configureTestingModule({
      imports: [Scoreboard],
      providers: [
        provideRouter([]),
        { provide: TournamentService, useValue: svcMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Scoreboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    svcMock = { getAll: vi.fn().mockReturnValue(of({ status: 'success', data: [] })) };
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // ------------------------------------------------------------
  //  CREACIÓN / ngOnInit
  // ------------------------------------------------------------
  describe('creación e inicialización', () => {
    it('debería crear el componente', async () => {
      await setup();
      expect(component).toBeTruthy();
    });

    it('restaura estado desde localStorage al iniciar', async () => {
      localStorage.setItem('inter_voley_scoreboard_state', JSON.stringify({
        localScore: 5, awayScore: 7, localSets: 1, awaySets: 0,
        localName: 'X', awayName: 'Y', maxPoints: 25, maxSets: 3
      }));
      await setup();
      expect(component.localScore()).toBe(5);
      expect(component.awayScore()).toBe(7);
      expect(component.localSets()).toBe(1);
      expect(component.awaySets()).toBe(0);
      expect(component.localName()).toBe('X');
      expect(component.awayName()).toBe('Y');
      expect(component.maxPoints()).toBe(25);
      expect(component.maxSets()).toBe(3);
    });

    it('aplica defaults cuando faltan campos en localStorage', async () => {
      localStorage.setItem('inter_voley_scoreboard_state', JSON.stringify({}));
      await setup();
      expect(component.localScore()).toBe(0);
      expect(component.localName()).toBe('LOCAL');
      expect(component.awayName()).toBe('VISITA');
      expect(component.maxPoints()).toBe(21);
      expect(component.maxSets()).toBe(1);
    });

    it('tolera JSON corrupto en localStorage sin lanzar', async () => {
      localStorage.setItem('inter_voley_scoreboard_state', '{not json');
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(setup()).resolves.not.toThrow();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    it('carga equipos del torneo activo', async () => {
      await setup('active');
      expect(component.tournamentTeams().length).toBe(2);
    });

    it('ignora torneos inactivos o borrados', async () => {
      svcMock.getAll.mockReturnValue(of({
        status: 'success',
        data: [
          makeTournament({ isActive: false, teams: [makeTeam()] }),
          makeTournament({ isActive: true, isDeleted: true, teams: [makeTeam()] })
        ]
      }));
      await setup();
      expect(component.tournamentTeams()).toEqual([]);
    });

    it('si el servicio falla deja tournamentTeams vacío', async () => {
      await setup('error');
      expect(component.tournamentTeams()).toEqual([]);
    });
  });

  // ------------------------------------------------------------
  //  updateScore
  // ------------------------------------------------------------
  describe('updateScore', () => {
    beforeEach(async () => { await setup(); });

    it('incrementa score local', () => {
      component.updateScore('local', 1);
      expect(component.localScore()).toBe(1);
    });

    it('incrementa score away', () => {
      component.updateScore('away', 1);
      expect(component.awayScore()).toBe(1);
    });

    it('no baja de 0', () => {
      component.updateScore('local', -1);
      expect(component.localScore()).toBe(0);
    });

    it('away no baja de 0', () => {
      component.updateScore('away', -1);
      expect(component.awayScore()).toBe(0);
    });

    it('no supera el límite maxPoints*2 (local)', () => {
      component.maxPoints.set(25);
      component.localScore.set(50);
      component.updateScore('local', 1);
      expect(component.localScore()).toBe(50);
    });

    it('no supera el límite maxPoints*2 (away)', () => {
      component.maxPoints.set(30);
      component.awayScore.set(60);
      component.updateScore('away', 1);
      expect(component.awayScore()).toBe(60);
    });

    it('al incrementar activa pulse en el equipo', () => {
      component.updateScore('local', 1);
      expect(component.localPulse()).toBe(true);
    });

    it('al decrementar no activa pulse', () => {
      component.localScore.set(5);
      component.updateScore('local', -1);
      expect(component.localPulse()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  checkSetWon — set regular
  // ------------------------------------------------------------
  describe('checkSetWon (set regular)', () => {
    beforeEach(async () => {
      await setup();
      component.maxPoints.set(21);
      component.maxSets.set(3);
    });

    it('detecta victoria local con diff >=2', () => {
      component.awayScore.set(15);
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(true);
      expect(component.setWinnerName()).toBe('LOCAL');
    });

    it('detecta victoria away con diff >=2', () => {
      component.localScore.set(15);
      component.awayScore.set(20);
      component.updateScore('away', 1);
      expect(component.showSetWonPopup()).toBe(true);
      expect(component.setWinnerName()).toBe('VISITA');
    });

    it('no marca set ganado si diff <2', () => {
      component.awayScore.set(20);
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(false);
    });

    it('no marca set ganado si score < maxPoints', () => {
      component.localScore.set(19);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(false);
    });

    it('ignora si ya hay popup de set abierto', () => {
      component.showSetWonPopup.set(true);
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.setWinnerName()).toBe('');
    });

    it('ignora si ya hay popup de partido abierto', () => {
      component.showMatchWonPopup.set(true);
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(false);
    });

    it('ignora si el partido ya terminó (sets alcanzados)', () => {
      component.maxSets.set(1);
      component.localSets.set(1);
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  checkSetWon — último set / partido
  // ------------------------------------------------------------
  describe('checkSetWon (último set)', () => {
    beforeEach(async () => {
      await setup();
      component.maxPoints.set(21);
      component.maxSets.set(1);
    });

    it('suma automáticamente el set al ganador', () => {
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.localSets()).toBe(1);
    });

    it('abre matchWonPopup con el nombre del ganador', () => {
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showMatchWonPopup()).toBe(true);
      expect(component.matchWinnerName()).toBe('LOCAL');
    });

    it('clamp de sets a <=9', () => {
      component.localSets.set(9);
      component.maxSets.set(10);
      component.localScore.set(20);
      // simulamos un partido en su último set con sets ya cerca del clamp
      component.updateScore('local', 1);
      expect(component.localSets()).toBeLessThanOrEqual(9);
    });

    it('no abre setWonPopup cuando es el último set', () => {
      component.localScore.set(20);
      component.updateScore('local', 1);
      expect(component.showSetWonPopup()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  startNextSet
  // ------------------------------------------------------------
  describe('startNextSet', () => {
    beforeEach(async () => { await setup(); });

    it('suma set al ganador local y resetea puntos', () => {
      component.setWinnerName.set(component.localName());
      component.localScore.set(21);
      component.awayScore.set(15);
      component.startNextSet();
      expect(component.localSets()).toBe(1);
      expect(component.localScore()).toBe(0);
      expect(component.awayScore()).toBe(0);
    });

    it('suma set al ganador away', () => {
      component.setWinnerName.set(component.awayName());
      component.startNextSet();
      expect(component.awaySets()).toBe(1);
    });

    it('cierra el popup de set ganado', () => {
      component.showSetWonPopup.set(true);
      component.setWinnerName.set(component.localName());
      component.startNextSet();
      expect(component.showSetWonPopup()).toBe(false);
    });

    it('clamp de sets a <=9', () => {
      component.localSets.set(9);
      component.setWinnerName.set(component.localName());
      component.startNextSet();
      expect(component.localSets()).toBe(9);
    });
  });

  describe('dismiss popups', () => {
    beforeEach(async () => { await setup(); });

    it('dismissSetWon cierra popup sin tocar marcador', () => {
      component.localScore.set(21);
      component.localSets.set(0);
      component.showSetWonPopup.set(true);
      component.dismissSetWon();
      expect(component.showSetWonPopup()).toBe(false);
      expect(component.localScore()).toBe(21);
      expect(component.localSets()).toBe(0);
    });

    it('dismissMatchWon cierra popup', () => {
      component.showMatchWonPopup.set(true);
      component.dismissMatchWon();
      expect(component.showMatchWonPopup()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  triggerPulse
  // ------------------------------------------------------------
  describe('triggerPulse', () => {
    beforeEach(async () => { await setup(); });

    it('activa localPulse y lo apaga a los 300 ms', () => {
      vi.useFakeTimers();
      component.triggerPulse('local');
      expect(component.localPulse()).toBe(true);
      vi.advanceTimersByTime(300);
      expect(component.localPulse()).toBe(false);
    });

    it('activa awayPulse y lo apaga a los 300 ms', () => {
      vi.useFakeTimers();
      component.triggerPulse('away');
      expect(component.awayPulse()).toBe(true);
      vi.advanceTimersByTime(300);
      expect(component.awayPulse()).toBe(false);
    });

    it('antes de 300 ms el pulse sigue activo', () => {
      vi.useFakeTimers();
      component.triggerPulse('local');
      vi.advanceTimersByTime(150);
      expect(component.localPulse()).toBe(true);
    });
  });

  // ------------------------------------------------------------
  //  updateSets
  // ------------------------------------------------------------
  describe('updateSets', () => {
    beforeEach(async () => {
      await setup();
      component.maxSets.set(3);
    });

    it('incrementa sets local', () => {
      component.updateSets('local', 1);
      expect(component.localSets()).toBe(1);
    });

    it('no baja de 0', () => {
      component.updateSets('local', -1);
      expect(component.localSets()).toBe(0);
    });

    it('no supera maxSets', () => {
      component.localSets.set(3);
      component.updateSets('local', 1);
      expect(component.localSets()).toBe(3);
    });

    it('away funciona igual', () => {
      component.updateSets('away', 2);
      expect(component.awaySets()).toBe(2);
    });
  });

  // ------------------------------------------------------------
  //  switchSides
  // ------------------------------------------------------------
  describe('switchSides', () => {
    beforeEach(async () => { await setup(); });

    it('intercambia nombres, scores y sets', () => {
      component.localName.set('A'); component.awayName.set('B');
      component.localScore.set(10); component.awayScore.set(20);
      component.localSets.set(1); component.awaySets.set(2);

      component.switchSides();

      expect(component.localName()).toBe('B');
      expect(component.awayName()).toBe('A');
      expect(component.localScore()).toBe(20);
      expect(component.awayScore()).toBe(10);
      expect(component.localSets()).toBe(2);
      expect(component.awaySets()).toBe(1);
    });
  });

  // ------------------------------------------------------------
  //  Reset
  // ------------------------------------------------------------
  describe('reset', () => {
    beforeEach(async () => {
      await setup();
      component.localName.set('X'); component.awayName.set('Y');
      component.localScore.set(10); component.awayScore.set(8);
      component.localSets.set(1); component.awaySets.set(2);
      component.showSetWonPopup.set(true);
      component.showMatchWonPopup.set(true);
      component.showResetDialog.set(true);
    });

    it('requestReset abre el diálogo', () => {
      component.showResetDialog.set(false);
      component.requestReset();
      expect(component.showResetDialog()).toBe(true);
    });

    it('cancelReset cierra el diálogo', () => {
      component.cancelReset();
      expect(component.showResetDialog()).toBe(false);
    });

    it('confirmReset restaura nombres por defecto', () => {
      component.confirmReset();
      expect(component.localName()).toBe('LOCAL');
      expect(component.awayName()).toBe('VISITA');
    });

    it('confirmReset pone puntos y sets a 0', () => {
      component.confirmReset();
      expect(component.localScore()).toBe(0);
      expect(component.awayScore()).toBe(0);
      expect(component.localSets()).toBe(0);
      expect(component.awaySets()).toBe(0);
    });

    it('confirmReset establece maxPoints=25 y maxSets=3', () => {
      component.confirmReset();
      expect(component.maxPoints()).toBe(25);
      expect(component.maxSets()).toBe(3);
    });

    it('confirmReset cierra todos los popups y el diálogo', () => {
      component.confirmReset();
      expect(component.showResetDialog()).toBe(false);
      expect(component.showSetWonPopup()).toBe(false);
      expect(component.showMatchWonPopup()).toBe(false);
    });

    it('confirmResetKeepNames mantiene los nombres', () => {
      component.confirmResetKeepNames();
      expect(component.localName()).toBe('X');
      expect(component.awayName()).toBe('Y');
    });

    it('confirmResetKeepNames también resetea puntos y config', () => {
      component.confirmResetKeepNames();
      expect(component.localScore()).toBe(0);
      expect(component.localSets()).toBe(0);
      expect(component.maxPoints()).toBe(25);
      expect(component.maxSets()).toBe(3);
    });
  });

  // ------------------------------------------------------------
  //  Edición inline de nombres
  // ------------------------------------------------------------
  describe('edición de nombres', () => {
    beforeEach(async () => { await setup(); });

    it('startEditingName activa el flag correspondiente', () => {
      component.startEditingName('local');
      expect(component.editingLocalName()).toBe(true);
      component.startEditingName('away');
      expect(component.editingAwayName()).toBe(true);
    });

    it('onNameInput actualiza el signal con el value', () => {
      const evt = { target: { value: 'NuevoNombre' } } as any;
      component.onNameInput('local', evt);
      expect(component.localName()).toBe('NuevoNombre');
    });

    it('finishEditingName aplica trim+upper y cierra edición', () => {
      component.localName.set('  hola  ');
      component.editingLocalName.set(true);
      component.finishEditingName('local');
      expect(component.localName()).toBe('HOLA');
      expect(component.editingLocalName()).toBe(false);
    });

    it('si el nombre queda vacío usa el fallback LOCAL/VISITA', () => {
      component.localName.set('   ');
      component.finishEditingName('local');
      expect(component.localName()).toBe('LOCAL');

      component.awayName.set('');
      component.finishEditingName('away');
      expect(component.awayName()).toBe('VISITA');
    });
  });

  // ------------------------------------------------------------
  //  maxPoints / maxSets edition
  // ------------------------------------------------------------
  describe('edición de maxPoints / maxSets', () => {
    beforeEach(async () => { await setup(); });

    it('startEditingMaxPoints activa flag', () => {
      component.startEditingMaxPoints();
      expect(component.editingMaxPoints()).toBe(true);
    });

    it('finishEditingMaxPoints acepta entero válido', () => {
      component.finishEditingMaxPoints('30');
      expect(component.maxPoints()).toBe(30);
      expect(component.editingMaxPoints()).toBe(false);
    });

    it('rechaza no-numérico (mantiene valor anterior)', () => {
      component.maxPoints.set(21);
      component.finishEditingMaxPoints('abc');
      expect(component.maxPoints()).toBe(21);
    });

    it('rechaza valores fuera de rango (<=0 o >99)', () => {
      component.maxPoints.set(21);
      component.finishEditingMaxPoints('0');
      expect(component.maxPoints()).toBe(21);
      component.finishEditingMaxPoints('100');
      expect(component.maxPoints()).toBe(21);
    });

    it('si queda <1 aplica fallback 25', () => {
      component.maxPoints.set(0);
      component.finishEditingMaxPoints();
      expect(component.maxPoints()).toBe(25);
    });

    it('maxSets: acepta valor válido', () => {
      component.finishEditingMaxSets('5');
      expect(component.maxSets()).toBe(5);
      expect(component.editingMaxSets()).toBe(false);
    });

    it('maxSets: si queda <1 aplica fallback 3', () => {
      component.maxSets.set(0);
      component.finishEditingMaxSets();
      expect(component.maxSets()).toBe(3);
    });
  });

  // ------------------------------------------------------------
  //  Persistencia
  // ------------------------------------------------------------
  describe('persistencia en localStorage', () => {
    it('cualquier cambio escribe en localStorage', async () => {
      await setup();
      component.localScore.set(15);
      // Disparar effect tras cambios
      TestBed.tick();
      fixture.detectChanges();
      const raw = localStorage.getItem('inter_voley_scoreboard_state');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.localScore).toBe(15);
    });

    it('al recrear el componente recupera el estado previo', async () => {
      await setup();
      component.localScore.set(7);
      component.awayName.set('OTRO');
      TestBed.tick();

      // Recrear desde cero
      TestBed.resetTestingModule();
      svcMock = { getAll: vi.fn().mockReturnValue(of({ status: 'success', data: [] })) };
      await setup();

      expect(component.localScore()).toBe(7);
      expect(component.awayName()).toBe('OTRO');
    });
  });
});
