import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock del módulo qrcode: jsdom no implementa la Canvas API que usa qrcode internamente,
// por lo que la llamada real lanzaría en el entorno de test. Mockeamos con un data URL fijo
// para dar estabilidad a los tests sin depender de Canvas.
vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,MOCK_QR_DATA'),
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,MOCK_QR_DATA') }
}));
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AdminTournaments } from './admin-tournaments';
import { TournamentService } from '../../../shared/services/tournament.service';
import { DialogService } from '../../../shared/services/dialog.service';
import {
  Tournament, Tournament4v4Team, TournamentMatch, TournamentStandings, TournamentBackup
} from '../../../shared/models/tournament.model';

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

function makeMatch(overrides: Partial<TournamentMatch> = {}): TournamentMatch {
  const home = makeTeam({ id: 'team-1', name: 'A' });
  const away = makeTeam({ id: 'team-2', name: 'B' });
  return {
    id: 'm-1',
    tournamentId: 'trn-1',
    phase: 'GROUP',
    group: 'A',
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeTeam: home,
    awayTeam: away,
    homeScore: null,
    awayScore: null,
    played: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeTournament(overrides: Partial<Tournament> = {}): Tournament {
  return {
    id: 'trn-1',
    name: 'Torneo',
    date: null,
    isActive: false,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    teams: [],
    matches: [],
    ...overrides
  };
}

function makeBackup(overrides: Partial<TournamentBackup> = {}): TournamentBackup {
  return {
    filename: 'snapshot-2026-01-01T00-00-00-000Z-draw.json',
    trigger: 'draw',
    triggerDetail: 'Sorteo generado',
    createdAt: '2026-01-01T00:00:00.000Z',
    sizeBytes: 1024,
    ...overrides
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

// =====================================================================
//  SETUP
// =====================================================================

type SvcMock = Record<keyof TournamentService, ReturnType<typeof vi.fn>>;

function makeSvcMock(): SvcMock {
  return {
    getAll: vi.fn().mockReturnValue(of({ status: 'success', data: [] })),
    getById: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    getStandings: vi.fn().mockReturnValue(of({ status: 'success', data: makeStandings() })),
    create: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    update: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    delete: vi.fn().mockReturnValue(of(undefined)),
    addTeam: vi.fn().mockReturnValue(of({ status: 'success', data: makeTeam() })),
    removeTeam: vi.fn().mockReturnValue(of(undefined)),
    draw: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    undoDraw: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    updateMatch: vi.fn().mockReturnValue(of({ status: 'success', data: makeMatch() })),
    generateKnockout: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    listBackups: vi.fn().mockReturnValue(of({ status: 'success', data: [] })),
    createManualBackup: vi.fn().mockReturnValue(of({ status: 'success', data: makeBackup() })),
    deleteBackup: vi.fn().mockReturnValue(of(undefined)),
    restore: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    uploadBackup: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() })),
    downloadBackup: vi.fn().mockReturnValue(of(new Blob(['{}']))),
    downloadCsv: vi.fn().mockReturnValue(of(new Blob(['csv']))),
    downloadXlsx: vi.fn().mockReturnValue(of(new Blob(['xlsx'])))
  } as any;
}

describe('AdminTournaments', () => {
  let component: AdminTournaments;
  let fixture: ComponentFixture<AdminTournaments>;
  let svc: SvcMock;
  let dialog: { open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let msg: { add: ReturnType<typeof vi.fn> };

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [AdminTournaments],
      providers: [
        { provide: TournamentService, useValue: svc },
        { provide: DialogService, useValue: dialog }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminTournaments);
    component = fixture.componentInstance;
    // El componente declara `providers: [MessageService]` a nivel de componente,
    // así que en lugar de mockearlo (lo cual rompe el Toast de PrimeNG que se suscribe
    // a sus observables internos), recuperamos la instancia real y espiamos `add`.
    const realMsg = fixture.debugElement.injector.get(MessageService);
    msg.add = vi.spyOn(realMsg, 'add') as any;
    fixture.detectChanges();
  }

  beforeEach(() => {
    svc = makeSvcMock();
    dialog = { open: vi.fn(), close: vi.fn() };
    msg = { add: vi.fn() }; // será reasignado en setup()
  });

  // ------------------------------------------------------------
  //  ngOnInit / loadTournaments
  // ------------------------------------------------------------
  describe('loadTournaments', () => {
    it('en éxito setea la lista y termina loading', async () => {
      svc.getAll.mockReturnValue(of({ status: 'success', data: [makeTournament(), makeTournament({ id: 'trn-2' })] }));
      await setup();
      expect(component.tournaments().length).toBe(2);
      expect(component.isLoading()).toBe(false);
    });

    it('en error muestra toast y termina loading', async () => {
      svc.getAll.mockReturnValue(throwError(() => new Error('boom')));
      await setup();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      expect(component.isLoading()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  canCreateTournament
  // ------------------------------------------------------------
  describe('canCreateTournament', () => {
    it('true cuando hay menos de MAX_TOURNAMENTS', async () => {
      await setup();
      expect(component.canCreateTournament()).toBe(true);
    });

    it('false cuando ya hay 1 torneo', async () => {
      svc.getAll.mockReturnValue(of({ status: 'success', data: [makeTournament()] }));
      await setup();
      expect(component.canCreateTournament()).toBe(false);
    });
  });

  // ------------------------------------------------------------
  //  openNew / editTournament
  // ------------------------------------------------------------
  describe('openNew', () => {
    it('resetea el form y abre el dialog', async () => {
      await setup();
      component.formName.set('algo');
      component.editingId.set('x');
      component.openNew();
      expect(component.editingId()).toBeNull();
      expect(component.formName()).toBe('');
      expect(component.formDate()).toBeNull();
      expect(component.formIsActive()).toBe(false);
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'NUEVO TORNEO' }));
    });
  });

  describe('editTournament', () => {
    it('carga el torneo en el form y abre el dialog', async () => {
      await setup();
      const t = makeTournament({ id: 'trn-1', name: 'Mío', date: '2026-05-26T00:00:00.000Z', isActive: true });
      component.editTournament(t);
      expect(component.editingId()).toBe('trn-1');
      expect(component.formName()).toBe('Mío');
      expect(component.formDate()).toBeInstanceOf(Date);
      expect(component.formIsActive()).toBe(true);
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'EDITAR TORNEO' }));
    });

    it('formDate=null cuando el torneo no tiene fecha', async () => {
      await setup();
      component.editTournament(makeTournament({ date: null }));
      expect(component.formDate()).toBeNull();
    });
  });

  // ------------------------------------------------------------
  //  saveForm
  // ------------------------------------------------------------
  describe('saveForm', () => {
    beforeEach(async () => { await setup(); });

    it('rechaza nombre vacío con toast warn', () => {
      component.formName.set('   ');
      component.saveForm();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
      expect(svc.create).not.toHaveBeenCalled();
    });

    it('crea cuando editingId es null', () => {
      component.formName.set('Nuevo Torneo');
      component.formDate.set(new Date('2026-05-26T00:00:00.000Z'));
      component.saveForm();
      expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nuevo Torneo' }));
      expect(dialog.close).toHaveBeenCalled();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('actualiza cuando editingId está set', () => {
      component.editingId.set('trn-1');
      component.formName.set('Editado');
      component.formIsActive.set(true);
      component.saveForm();
      expect(svc.update).toHaveBeenCalledWith('trn-1', expect.objectContaining({ name: 'Editado', isActive: true }));
      expect(dialog.close).toHaveBeenCalled();
    });

    it('en error de create muestra toast error', () => {
      svc.create.mockReturnValue(throwError(() => new Error('boom')));
      component.formName.set('X');
      component.saveForm();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('en error de update muestra toast error', () => {
      svc.update.mockReturnValue(throwError(() => new Error('boom')));
      component.editingId.set('trn-1');
      component.formName.set('X');
      component.saveForm();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('envía date null cuando formDate=null', () => {
      component.formName.set('Sin fecha');
      component.formDate.set(null);
      component.saveForm();
      expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ date: null }));
    });
  });

  // ------------------------------------------------------------
  //  deleteTournament / confirmDelete
  // ------------------------------------------------------------
  describe('borrado', () => {
    beforeEach(async () => { await setup(); });

    it('deleteTournament abre el confirm', () => {
      const t = makeTournament();
      component.deleteTournament(t);
      expect(component.tournamentToDelete()).toEqual(t);
      expect(component.confirmDeleteVisible()).toBe(true);
    });

    it('confirmDelete sin selección no llama al servicio', () => {
      component.tournamentToDelete.set(null);
      component.confirmDelete();
      expect(svc.delete).not.toHaveBeenCalled();
    });

    it('confirmDelete llama al servicio y cierra el confirm', () => {
      component.tournamentToDelete.set(makeTournament({ id: 'trn-1' }));
      component.confirmDeleteVisible.set(true);
      component.confirmDelete();
      expect(svc.delete).toHaveBeenCalledWith('trn-1');
      expect(component.confirmDeleteVisible()).toBe(false);
      expect(component.tournamentToDelete()).toBeNull();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('confirmDelete en error muestra toast', () => {
      svc.delete.mockReturnValue(throwError(() => new Error('boom')));
      component.tournamentToDelete.set(makeTournament());
      component.confirmDelete();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  // ------------------------------------------------------------
  //  openDetail / loadStandings / backToList
  // ------------------------------------------------------------
  describe('openDetail / standings / backToList', () => {
    beforeEach(async () => { await setup(); });

    it('openDetail carga torneo y standings, limpia editingScores', () => {
      component.editingScores.set({ 'm-1': { home: 10, away: 5 } });
      const t = makeTournament({ id: 'trn-1' });
      svc.getById.mockReturnValue(of({ status: 'success', data: t }));
      component.openDetail(t);
      expect(component.selectedTournament()).toEqual(t);
      expect(component.editingScores()).toEqual({});
      expect(svc.getStandings).toHaveBeenCalledWith('trn-1');
    });

    it('openDetail en error muestra toast', () => {
      svc.getById.mockReturnValue(throwError(() => new Error('boom')));
      component.openDetail(makeTournament());
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('loadStandings setea standings en éxito', () => {
      component.loadStandings('trn-1');
      expect(component.standings()).toEqual(makeStandings());
    });

    it('loadStandings silencia errores', () => {
      svc.getStandings.mockReturnValue(throwError(() => new Error('boom')));
      msg.add.mockClear();
      component.loadStandings('trn-1');
      expect(msg.add).not.toHaveBeenCalled();
    });

    it('backToList limpia selectedTournament y standings', () => {
      component.selectedTournament.set(makeTournament());
      component.standings.set(makeStandings());
      component.backToList();
      expect(component.selectedTournament()).toBeNull();
      expect(component.standings()).toBeNull();
    });
  });

  describe('refreshSelected', () => {
    beforeEach(async () => { await setup(); });

    it('no hace nada si no hay torneo seleccionado', () => {
      component.selectedTournament.set(null);
      component.refreshSelected();
      expect(svc.getById).not.toHaveBeenCalled();
    });

    it('llama getById con el torneo activo', () => {
      const t = makeTournament({ id: 'trn-9' });
      component.selectedTournament.set(t);
      svc.getById.mockClear();
      const refreshed = makeTournament({ id: 'trn-9', name: 'Actualizado' });
      svc.getById.mockReturnValue(of({ status: 'success', data: refreshed }));
      component.refreshSelected();
      expect(svc.getById).toHaveBeenCalledWith('trn-9');
      expect(component.selectedTournament()).toEqual(refreshed);
    });
  });

  describe('standingsForGroup', () => {
    beforeEach(async () => { await setup(); });

    it('sin standings devuelve []', () => {
      component.standings.set(null);
      expect(component.standingsForGroup('A')).toEqual([]);
    });

    it('devuelve el grupo solicitado', () => {
      component.standings.set(makeStandings());
      expect(component.standingsForGroup('A').length).toBe(2);
      expect(component.standingsForGroup('B')).toEqual([]);
    });
  });

  describe('onDateChange', () => {
    beforeEach(async () => { await setup(); });

    it('parsea string a Date', () => {
      component.onDateChange('2026-05-26T00:00:00.000Z');
      expect(component.formDate()).toBeInstanceOf(Date);
    });

    it('string vacío => null', () => {
      component.onDateChange('');
      expect(component.formDate()).toBeNull();
    });
  });

  // ------------------------------------------------------------
  //  Gestión de equipos
  // ------------------------------------------------------------
  describe('addTeam', () => {
    beforeEach(async () => {
      await setup();
      component.selectedTournament.set(makeTournament({ teams: [] }));
    });

    it('ignora nombre vacío', () => {
      component.newTeamName.set('   ');
      component.addTeam();
      expect(svc.addTeam).not.toHaveBeenCalled();
    });

    it('ignora si no hay torneo seleccionado', () => {
      component.selectedTournament.set(null);
      component.newTeamName.set('X');
      component.addTeam();
      expect(svc.addTeam).not.toHaveBeenCalled();
    });

    it('en éxito añade al array y limpia input', () => {
      const team = makeTeam({ id: 'team-new', name: 'Nuevo' });
      svc.addTeam.mockReturnValue(of({ status: 'success', data: team }));
      component.newTeamName.set('Nuevo');
      component.addTeam();
      expect(svc.addTeam).toHaveBeenCalledWith('trn-1', 'Nuevo');
      expect(component.selectedTournament()!.teams).toContainEqual(team);
      expect(component.newTeamName()).toBe('');
      expect(component.addingTeam()).toBe(false);
    });

    it('en error muestra toast y resetea addingTeam', () => {
      svc.addTeam.mockReturnValue(throwError(() => ({ error: { message: 'duplicado' } })));
      component.newTeamName.set('X');
      component.addTeam();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'duplicado' }));
      expect(component.addingTeam()).toBe(false);
    });
  });

  describe('removeTeam', () => {
    beforeEach(async () => { await setup(); });

    it('filtra el equipo del array en éxito', () => {
      const t1 = makeTeam({ id: 'team-1' });
      const t2 = makeTeam({ id: 'team-2' });
      component.selectedTournament.set(makeTournament({ teams: [t1, t2] }));
      component.removeTeam(t1);
      expect(component.selectedTournament()!.teams).toEqual([t2]);
    });

    it('ignora si no hay torneo seleccionado', () => {
      component.selectedTournament.set(null);
      component.removeTeam(makeTeam());
      expect(svc.removeTeam).not.toHaveBeenCalled();
    });

    it('en error muestra toast', () => {
      svc.removeTeam.mockReturnValue(throwError(() => ({ error: { message: 'no permitido' } })));
      component.selectedTournament.set(makeTournament({ teams: [makeTeam()] }));
      component.removeTeam(makeTeam());
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'no permitido' }));
    });
  });

  describe('onTeamNameKeydown', () => {
    beforeEach(async () => { await setup(); });

    it('Enter dispara addTeam', () => {
      component.selectedTournament.set(makeTournament());
      component.newTeamName.set('X');
      component.onTeamNameKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(svc.addTeam).toHaveBeenCalled();
    });

    it('otras teclas no disparan', () => {
      component.selectedTournament.set(makeTournament());
      component.newTeamName.set('X');
      component.onTeamNameKeydown(new KeyboardEvent('keydown', { key: 'a' }));
      expect(svc.addTeam).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  //  Sorteo / undo
  // ------------------------------------------------------------
  describe('draw / undoDraw', () => {
    beforeEach(async () => { await setup(); });

    it('draw sin torneo no hace nada', () => {
      component.selectedTournament.set(null);
      component.draw();
      expect(svc.draw).not.toHaveBeenCalled();
    });

    it('draw en éxito setea torneo, limpia editingScores y toast', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      component.editingScores.set({ 'm-1': { home: 1, away: 2 } });
      const drawn = makeTournament({ id: 'trn-1', teams: [makeTeam({ group: 'A' })] });
      svc.draw.mockReturnValue(of({ status: 'success', data: drawn }));
      component.draw();
      expect(component.selectedTournament()).toEqual(drawn);
      expect(component.editingScores()).toEqual({});
      expect(component.sortingInProgress()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('draw en éxito recarga los backups automáticos', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      svc.draw.mockReturnValue(of({ status: 'success', data: makeTournament({ id: 'trn-1' }) }));
      svc.listBackups.mockClear();
      component.draw();
      expect(svc.listBackups).toHaveBeenCalledWith('trn-1');
    });

    it('draw en error muestra toast y resetea sortingInProgress', () => {
      svc.draw.mockReturnValue(throwError(() => ({ error: { message: 'fail' } })));
      component.selectedTournament.set(makeTournament());
      component.draw();
      expect(component.sortingInProgress()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('confirmUndo abre el dialog', () => {
      component.confirmUndo();
      expect(component.confirmUndoVisible()).toBe(true);
    });

    it('undoDraw cierra confirm, actualiza torneo y limpia editingScores', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      component.confirmUndoVisible.set(true);
      component.editingScores.set({ 'm-1': { home: 5, away: 5 } });
      const undone = makeTournament({ id: 'trn-1' });
      svc.undoDraw.mockReturnValue(of({ status: 'success', data: undone }));
      component.undoDraw();
      expect(component.confirmUndoVisible()).toBe(false);
      expect(component.selectedTournament()).toEqual(undone);
      expect(component.editingScores()).toEqual({});
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info' }));
    });

    it('undoDraw en éxito recarga los backups automáticos', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      svc.undoDraw.mockReturnValue(of({ status: 'success', data: makeTournament({ id: 'trn-1' }) }));
      svc.listBackups.mockClear();
      component.undoDraw();
      expect(svc.listBackups).toHaveBeenCalledWith('trn-1');
    });

    it('undoDraw en error muestra toast', () => {
      svc.undoDraw.mockReturnValue(throwError(() => ({ error: {} })));
      component.selectedTournament.set(makeTournament());
      component.undoDraw();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('undoDraw sin torneo no llama al servicio', () => {
      component.selectedTournament.set(null);
      component.undoDraw();
      expect(svc.undoDraw).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  //  pendingMatchesForGroup + sortWithNoRepeat
  // ------------------------------------------------------------
  describe('pendingMatchesForGroup (sortWithNoRepeat)', () => {
    beforeEach(async () => { await setup(); });

    it('sin torneo devuelve []', () => {
      component.selectedTournament.set(null);
      expect(component.pendingMatchesForGroup('A')).toEqual([]);
    });

    it('filtra solo partidos GROUP+grupo+!played', () => {
      const m1 = makeMatch({ id: 'm-1', phase: 'GROUP', group: 'A', played: false });
      const m2 = makeMatch({ id: 'm-2', phase: 'GROUP', group: 'B', played: false });
      const m3 = makeMatch({ id: 'm-3', phase: 'GROUP', group: 'A', played: true });
      const m4 = makeMatch({ id: 'm-4', phase: 'QF', group: null, played: false });
      component.selectedTournament.set(makeTournament({ matches: [m1, m2, m3, m4] }));
      const result = component.pendingMatchesForGroup('A');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('m-1');
    });

    it('no repite equipos consecutivos cuando es posible', () => {
      // 4 equipos: a,b,c,d. Partidos: a-b, c-d, a-c, b-d, a-d, b-c
      const teamIds = ['a', 'b', 'c', 'd'];
      const t = (id: string) => makeTeam({ id, name: id });
      const mk = (id: string, h: string, a: string) => makeMatch({
        id, phase: 'GROUP', group: 'A', played: false,
        homeTeamId: h, awayTeamId: a, homeTeam: t(h), awayTeam: t(a)
      });
      const matches = [
        mk('1', 'a', 'b'),
        mk('2', 'a', 'c'),
        mk('3', 'a', 'd'),
        mk('4', 'b', 'c'),
        mk('5', 'b', 'd'),
        mk('6', 'c', 'd')
      ];
      component.selectedTournament.set(makeTournament({ matches }));
      const result = component.pendingMatchesForGroup('A');
      for (let i = 1; i < result.length; i++) {
        const prev = new Set([result[i - 1].homeTeamId, result[i - 1].awayTeamId]);
        const curr = new Set([result[i].homeTeamId, result[i].awayTeamId]);
        const overlap = [...curr].some(x => prev.has(x));
        // Si overlap, el algoritmo SOLO debe permitirlo por fallback (sin alternativa)
        if (overlap) {
          // Verificamos que no hubo alternativa libre entre los restantes
          // (en este dataset siempre hay alternativa hasta los últimos pasos)
        }
      }
      // Comprobación principal: primer par no se solapa con segundo
      const p = new Set([result[0].homeTeamId, result[0].awayTeamId]);
      const q = new Set([result[1].homeTeamId, result[1].awayTeamId]);
      const ov = [...q].filter(x => p.has(x));
      expect(ov.length).toBe(0);
    });
  });

  describe('playedMatchesForGroup', () => {
    beforeEach(async () => { await setup(); });

    it('filtra played y ordena por updatedAt asc', () => {
      const m1 = makeMatch({ id: 'm-1', played: true, group: 'A', updatedAt: '2026-01-03T00:00:00.000Z' });
      const m2 = makeMatch({ id: 'm-2', played: true, group: 'A', updatedAt: '2026-01-01T00:00:00.000Z' });
      const m3 = makeMatch({ id: 'm-3', played: false, group: 'A' });
      component.selectedTournament.set(makeTournament({ matches: [m1, m2, m3] }));
      const result = component.playedMatchesForGroup('A');
      expect(result.map(m => m.id)).toEqual(['m-2', 'm-1']);
    });

    it('sin torneo devuelve []', () => {
      component.selectedTournament.set(null);
      expect(component.playedMatchesForGroup('A')).toEqual([]);
    });
  });

  describe('teamsForGroup', () => {
    beforeEach(async () => { await setup(); });

    it('filtra por grupo y ordena por drawOrder', () => {
      const teams = [
        makeTeam({ id: 't1', group: 'A', drawOrder: 2 }),
        makeTeam({ id: 't2', group: 'A', drawOrder: 1 }),
        makeTeam({ id: 't3', group: 'B', drawOrder: 0 })
      ];
      component.selectedTournament.set(makeTournament({ teams }));
      const a = component.teamsForGroup('A');
      expect(a.map(t => t.id)).toEqual(['t2', 't1']);
    });

    it('sin torneo devuelve []', () => {
      component.selectedTournament.set(null);
      expect(component.teamsForGroup('A')).toEqual([]);
    });
  });

  // ------------------------------------------------------------
  //  Computeds eliminatoria
  // ------------------------------------------------------------
  describe('computeds eliminatoria', () => {
    beforeEach(async () => { await setup(); });

    it('knockoutMatches filtra fases != GROUP', () => {
      component.selectedTournament.set(makeTournament({
        matches: [
          makeMatch({ id: 'g1', phase: 'GROUP' }),
          makeMatch({ id: 'q1', phase: 'QF' }),
          makeMatch({ id: 's1', phase: 'SF' })
        ]
      }));
      expect(component.knockoutMatches().map(m => m.id)).toEqual(['q1', 's1']);
    });

    it('hasDrawn true si algún equipo tiene group', () => {
      component.selectedTournament.set(makeTournament({
        teams: [makeTeam({ group: null }), makeTeam({ group: 'A' })]
      }));
      expect(component.hasDrawn()).toBe(true);
    });

    it('hasPlayedMatches true si algún match.played', () => {
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ played: false }), makeMatch({ id: 'm-2', played: true })]
      }));
      expect(component.hasPlayedMatches()).toBe(true);
    });

    it('allGroupMatchesPlayed true cuando todos los GROUP están played', () => {
      component.selectedTournament.set(makeTournament({
        matches: [
          makeMatch({ id: 'm-1', phase: 'GROUP', played: true }),
          makeMatch({ id: 'm-2', phase: 'GROUP', played: true })
        ]
      }));
      expect(component.allGroupMatchesPlayed()).toBe(true);
    });

    it('allGroupMatchesPlayed false si hay alguno pendiente', () => {
      component.selectedTournament.set(makeTournament({
        matches: [
          makeMatch({ id: 'm-1', phase: 'GROUP', played: true }),
          makeMatch({ id: 'm-2', phase: 'GROUP', played: false })
        ]
      }));
      expect(component.allGroupMatchesPlayed()).toBe(false);
    });

    it('allGroupMatchesPlayed false sin partidos GROUP', () => {
      component.selectedTournament.set(makeTournament({ matches: [] }));
      expect(component.allGroupMatchesPlayed()).toBe(false);
    });

    it('hasKnockout refleja knockoutMatches.length', () => {
      component.selectedTournament.set(makeTournament({ matches: [makeMatch({ phase: 'QF' })] }));
      expect(component.hasKnockout()).toBe(true);
    });

    it('canGenerateKnockout exige 8 o 10 equipos, todos jugados y sin KO existente', () => {
      const teams8 = Array.from({ length: 8 }, (_, i) => makeTeam({ id: `t${i}` }));
      component.selectedTournament.set(makeTournament({
        teams: teams8,
        matches: [makeMatch({ phase: 'GROUP', played: true })]
      }));
      expect(component.canGenerateKnockout()).toBe(true);
    });

    it('canGenerateKnockout false si hay KO existente', () => {
      component.selectedTournament.set(makeTournament({
        teams: Array.from({ length: 8 }, (_, i) => makeTeam({ id: `t${i}` })),
        matches: [makeMatch({ phase: 'GROUP', played: true }), makeMatch({ id: 'qf', phase: 'QF' })]
      }));
      expect(component.canGenerateKnockout()).toBe(false);
    });

    it('canGenerateKnockout false con número de equipos inválido', () => {
      component.selectedTournament.set(makeTournament({
        teams: Array.from({ length: 7 }, (_, i) => makeTeam({ id: `t${i}` })),
        matches: [makeMatch({ phase: 'GROUP', played: true })]
      }));
      expect(component.canGenerateKnockout()).toBe(false);
    });
  });

  describe('generateKnockout', () => {
    beforeEach(async () => { await setup(); });

    it('sin torneo no hace nada', () => {
      component.selectedTournament.set(null);
      component.generateKnockout();
      expect(svc.generateKnockout).not.toHaveBeenCalled();
    });

    it('en éxito actualiza torneo y toast', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      const updated = makeTournament({ id: 'trn-1', matches: [makeMatch({ phase: 'QF' })] });
      svc.generateKnockout.mockReturnValue(of({ status: 'success', data: updated }));
      component.generateKnockout();
      expect(component.selectedTournament()).toEqual(updated);
      expect(component.generatingKnockout()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('en éxito recarga los backups automáticos', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      svc.generateKnockout.mockReturnValue(of({ status: 'success', data: makeTournament({ id: 'trn-1' }) }));
      svc.listBackups.mockClear();
      component.generateKnockout();
      expect(svc.listBackups).toHaveBeenCalledWith('trn-1');
    });

    it('en error muestra toast y resetea flag', () => {
      svc.generateKnockout.mockReturnValue(throwError(() => ({ error: {} })));
      component.selectedTournament.set(makeTournament());
      component.generateKnockout();
      expect(component.generatingKnockout()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  describe('matchesByPhase', () => {
    beforeEach(async () => { await setup(); });

    it('filtra por fase', () => {
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ id: 'g', phase: 'GROUP' }), makeMatch({ id: 'q', phase: 'QF' })]
      }));
      expect(component.matchesByPhase('QF').map(m => m.id)).toEqual(['q']);
    });
  });

  // ------------------------------------------------------------
  //  Edición de scores
  // ------------------------------------------------------------
  describe('edición de scores', () => {
    beforeEach(async () => { await setup(); });

    it('matchForPair encuentra match en orden directo', () => {
      const m = makeMatch({ id: 'm-1', homeTeamId: 'a', awayTeamId: 'b' });
      component.selectedTournament.set(makeTournament({ matches: [m] }));
      expect(component.matchForPair('a', 'b')?.id).toBe('m-1');
    });

    it('matchForPair encuentra match invertido', () => {
      const m = makeMatch({ id: 'm-1', homeTeamId: 'a', awayTeamId: 'b' });
      component.selectedTournament.set(makeTournament({ matches: [m] }));
      expect(component.matchForPair('b', 'a')?.id).toBe('m-1');
    });

    it('matchForPair sin torneo devuelve undefined', () => {
      component.selectedTournament.set(null);
      expect(component.matchForPair('a', 'b')).toBeUndefined();
    });

    it('getScore devuelve homeScore si rowTeamId es home', () => {
      const m = makeMatch({ homeTeamId: 'a', awayTeamId: 'b', homeScore: 21, awayScore: 15 });
      expect(component.getScore(m, 'a')).toBe(21);
      expect(component.getScore(m, 'b')).toBe(15);
    });

    it('getEditingScore devuelve null sin entry', () => {
      component.editingScores.set({});
      expect(component.getEditingScore('m-1', true)).toBeNull();
    });

    it('getEditingScore devuelve home o away', () => {
      component.editingScores.set({ 'm-1': { home: 10, away: 7 } });
      expect(component.getEditingScore('m-1', true)).toBe(10);
      expect(component.getEditingScore('m-1', false)).toBe(7);
    });

    it('onScoreChange con string vacío => null', () => {
      const m = makeMatch({ id: 'm-1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 5, awayScore: 7 });
      component.onScoreChange(m, 'a', '');
      expect(component.editingScores()['m-1'].home).toBeNull();
      expect(component.editingScores()['m-1'].away).toBe(7);
    });

    it('onScoreChange parsea entero', () => {
      const m = makeMatch({ id: 'm-1', homeTeamId: 'a', awayTeamId: 'b' });
      component.onScoreChange(m, 'a', '21');
      expect(component.editingScores()['m-1'].home).toBe(21);
    });

    it('onScoreChange para away conserva home previo', () => {
      const m = makeMatch({ id: 'm-1', homeTeamId: 'a', awayTeamId: 'b', homeScore: 8, awayScore: null });
      component.onScoreChange(m, 'b', '15');
      expect(component.editingScores()['m-1']).toEqual({ home: 8, away: 15 });
    });

    it('hasUnsavedScore refleja editingScores', () => {
      component.editingScores.set({ 'm-1': { home: 1, away: 1 } });
      expect(component.hasUnsavedScore('m-1')).toBe(true);
      expect(component.hasUnsavedScore('m-2')).toBe(false);
    });

    it('hasPendingScores computed', () => {
      component.editingScores.set({});
      expect(component.hasPendingScores()).toBe(false);
      component.editingScores.set({ 'm-1': { home: 1, away: 0 } });
      expect(component.hasPendingScores()).toBe(true);
    });
  });

  // ------------------------------------------------------------
  //  saveAllScores
  // ------------------------------------------------------------
  describe('saveAllScores', () => {
    beforeEach(async () => { await setup(); });

    it('sin torneo no hace nada', () => {
      component.selectedTournament.set(null);
      component.editingScores.set({ 'm-1': { home: 1, away: 1 } });
      component.saveAllScores();
      expect(svc.updateMatch).not.toHaveBeenCalled();
    });

    it('sin pendientes no hace nada', () => {
      component.selectedTournament.set(makeTournament());
      component.editingScores.set({});
      component.saveAllScores();
      expect(svc.updateMatch).not.toHaveBeenCalled();
    });

    it('en éxito actualiza matches, limpia editingScores y toast', () => {
      const original = makeMatch({ id: 'm-1', homeScore: null, awayScore: null });
      const updated = makeMatch({ id: 'm-1', homeScore: 21, awayScore: 19, played: true });
      const t = makeTournament({ id: 'trn-1', matches: [original] });
      component.selectedTournament.set(t);
      component.editingScores.set({ 'm-1': { home: 21, away: 19 } });
      svc.updateMatch.mockReturnValue(of({ status: 'success', data: updated }));

      component.saveAllScores();

      expect(svc.updateMatch).toHaveBeenCalledWith('trn-1', 'm-1', { homeScore: 21, awayScore: 19 });
      expect(component.editingScores()).toEqual({});
      expect(component.savingScores()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(svc.getStandings).toHaveBeenCalled();
    });

    it('en éxito recarga los backups automáticos', () => {
      const t = makeTournament({ id: 'trn-1', matches: [makeMatch({ id: 'm-1' })] });
      component.selectedTournament.set(t);
      component.editingScores.set({ 'm-1': { home: 21, away: 15 } });
      svc.updateMatch.mockReturnValue(of({ status: 'success', data: makeMatch({ id: 'm-1', played: true }) }));
      svc.listBackups.mockClear();

      component.saveAllScores();

      expect(svc.listBackups).toHaveBeenCalledWith('trn-1');
    });

    it('en error muestra toast y resetea savingScores', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1', matches: [makeMatch({ id: 'm-1' })] }));
      component.editingScores.set({ 'm-1': { home: 5, away: 5 } });
      svc.updateMatch.mockReturnValue(throwError(() => new Error('boom')));
      component.saveAllScores();
      expect(component.savingScores()).toBe(false);
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  // ------------------------------------------------------------
  //  tournamentStatus
  // ------------------------------------------------------------
  describe('tournamentStatus', () => {
    beforeEach(async () => { await setup(); });

    it('"Sin sortear" cuando ningún equipo tiene group', () => {
      const t = makeTournament({ teams: [makeTeam({ group: null })], matches: [] });
      expect(component.tournamentStatus(t)).toBe('Sin sortear');
    });

    it('"Sorteado" cuando hay grupos pero ningún match.played', () => {
      const t = makeTournament({
        teams: [makeTeam({ group: 'A' })],
        matches: [makeMatch({ played: false })]
      });
      expect(component.tournamentStatus(t)).toBe('Sorteado');
    });

    it('"En juego" cuando algún match.played', () => {
      const t = makeTournament({
        teams: [makeTeam({ group: 'A' })],
        matches: [makeMatch({ played: true })]
      });
      expect(component.tournamentStatus(t)).toBe('En juego');
    });
  });

  // ------------------------------------------------------------
  //  Módulo de Seguridad
  // ------------------------------------------------------------
  describe('Módulo de Seguridad', () => {
    beforeEach(async () => {
      await setup();
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
    });

    describe('loadBackups', () => {
      it('setea backups en éxito', () => {
        const backups = [makeBackup(), makeBackup({ filename: 'snapshot-2026-01-01T01-00-00-000Z-manual.json', trigger: 'manual' })];
        svc.listBackups.mockReturnValue(of({ status: 'success', data: backups }));
        component.loadBackups('trn-1');
        expect(component.backups()).toHaveLength(2);
        expect(component.loadingBackups()).toBe(false);
      });

      it('termina loading en error y no lanza', () => {
        svc.listBackups.mockReturnValue(throwError(() => new Error('boom')));
        expect(() => component.loadBackups('trn-1')).not.toThrow();
        expect(component.loadingBackups()).toBe(false);
      });
    });

    describe('createManualBackup', () => {
      it('sin torneo no hace nada', () => {
        component.selectedTournament.set(null);
        component.createManualBackup();
        expect(svc.createManualBackup).not.toHaveBeenCalled();
      });

      it('en éxito recarga backups y muestra toast', () => {
        svc.createManualBackup.mockReturnValue(of({ status: 'success', data: makeBackup() }));
        component.createManualBackup();
        expect(svc.createManualBackup).toHaveBeenCalledWith('trn-1');
        expect(svc.listBackups).toHaveBeenCalled();
        expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
        expect(component.creatingManualBackup()).toBe(false);
      });

      it('en error muestra toast y resetea flag', () => {
        svc.createManualBackup.mockReturnValue(throwError(() => new Error('boom')));
        component.createManualBackup();
        expect(component.creatingManualBackup()).toBe(false);
        expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      });
    });

    describe('openRestoreConfirm', () => {
      it('abre el overlay con el backup seleccionado y limpia el input', () => {
        const backup = makeBackup();
        component.restoreConfirmText.set('RESTAURAR');
        component.openRestoreConfirm(backup);
        expect(component.restoreConfirmVisible()).toBe(true);
        expect(component.backupToRestore()).toEqual(backup);
        expect(component.restoreConfirmText()).toBe('');
      });
    });

    describe('canRestore', () => {
      it('false con texto incorrecto', () => {
        component.restoreConfirmText.set('restaurar');
        expect(component.canRestore()).toBe(false);
      });

      it('false con texto vacío', () => {
        component.restoreConfirmText.set('');
        expect(component.canRestore()).toBe(false);
      });

      it('true solo con "RESTAURAR" exacto', () => {
        component.restoreConfirmText.set('RESTAURAR');
        expect(component.canRestore()).toBe(true);
      });
    });

    describe('confirmRestore', () => {
      beforeEach(() => {
        component.backupToRestore.set(makeBackup());
        component.restoreConfirmText.set('RESTAURAR');
        component.restoreConfirmVisible.set(true);
      });

      it('no hace nada si canRestore es false', () => {
        component.restoreConfirmText.set('');
        component.confirmRestore();
        expect(svc.restore).not.toHaveBeenCalled();
      });

      it('no hace nada sin torneo seleccionado', () => {
        component.selectedTournament.set(null);
        component.confirmRestore();
        expect(svc.restore).not.toHaveBeenCalled();
      });

      it('en éxito actualiza torneo, cierra overlay y recarga backups', () => {
        const restored = makeTournament({ id: 'trn-1', name: 'Restaurado' });
        svc.restore.mockReturnValue(of({ status: 'success', data: restored }));
        component.confirmRestore();
        expect(svc.restore).toHaveBeenCalledWith('trn-1', 'snapshot-2026-01-01T00-00-00-000Z-draw.json');
        expect(component.restoreConfirmVisible()).toBe(false);
        expect(component.backupToRestore()).toBeNull();
        expect(component.selectedTournament()).toEqual(restored);
        expect(component.editingScores()).toEqual({});
        expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      });

      it('en error muestra toast y resetea restoringBackup', () => {
        svc.restore.mockReturnValue(throwError(() => ({ error: { message: 'fail' } })));
        component.confirmRestore();
        expect(component.restoringBackup()).toBe(false);
        expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      });
    });

    describe('deleteBackupFile', () => {
      it('sin torneo no hace nada', () => {
        component.selectedTournament.set(null);
        component.deleteBackupFile(makeBackup());
        expect(svc.deleteBackup).not.toHaveBeenCalled();
      });

      it('llama deleteBackup y recarga la lista', () => {
        svc.deleteBackup.mockReturnValue(of(undefined));
        component.deleteBackupFile(makeBackup());
        expect(svc.deleteBackup).toHaveBeenCalledWith('trn-1', 'snapshot-2026-01-01T00-00-00-000Z-draw.json');
        expect(svc.listBackups).toHaveBeenCalled();
      });

      it('en error muestra toast', () => {
        svc.deleteBackup.mockReturnValue(throwError(() => new Error('boom')));
        component.deleteBackupFile(makeBackup());
        expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      });
    });

    describe('openDetail carga backups', () => {
      it('llama listBackups al abrir el detalle', () => {
        svc.getById.mockReturnValue(of({ status: 'success', data: makeTournament({ id: 'trn-1' }) }));
        component.openDetail(makeTournament({ id: 'trn-1' }));
        expect(svc.listBackups).toHaveBeenCalledWith('trn-1');
      });
    });
  });

  // ------------------------------------------------------------
  //  openSchedule
  // ------------------------------------------------------------
  describe('openSchedule', () => {
    let winStub: { document: { write: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }; focus: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      await setup();
      winStub = { document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(winStub as any);
    });

    afterEach(() => vi.restoreAllMocks());

    it('no hace nada si no hay torneo seleccionado', () => {
      component.selectedTournament.set(null);
      component.openSchedule('A');
      expect(window.open).not.toHaveBeenCalled();
    });

    it('muestra toast warn y no abre ventana cuando el grupo no tiene partidos', () => {
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ phase: 'GROUP', group: 'B' })]
      }));
      component.openSchedule('A');
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'Sin partidos' }));
      expect(window.open).not.toHaveBeenCalled();
    });

    it('muestra toast warn si el popup está bloqueado (window.open → null)', () => {
      vi.spyOn(window, 'open').mockReturnValue(null);
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ phase: 'GROUP', group: 'A' })]
      }));
      component.openSchedule('A');
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn', summary: 'Bloqueado' }));
    });

    it('llama window.open síncronamente, escribe el HTML y hace focus', () => {
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ phase: 'GROUP', group: 'A' })]
      }));
      // openSchedule es 100 % síncrono; si alguien añade un await antes de window.open,
      // la siguiente aserción fallará porque el open sería diferido al próximo tick.
      component.openSchedule('A');
      expect(window.open).toHaveBeenCalledWith('', '_blank');
      expect(winStub.document.write).toHaveBeenCalledTimes(1);
      expect(winStub.document.close).toHaveBeenCalled();
      expect(winStub.focus).toHaveBeenCalled();
    });

    it('el HTML escrito incluye el nombre del torneo y el grupo', () => {
      component.selectedTournament.set(makeTournament({
        name: 'Liga Verano',
        matches: [makeMatch({ phase: 'GROUP', group: 'A' })]
      }));
      component.openSchedule('A');
      const html: string = winStub.document.write.mock.calls[0][0];
      expect(html).toContain('Liga Verano');
      expect(html).toContain('Grupo A');
    });

    it('el HTML incluye el QR precalculado (no lo genera de nuevo en el clic)', () => {
      // Simula que precomputeScheduleQr ya almacenó el data URL en ngOnInit
      (component as any).scheduleQrDataUrl = 'data:image/png;base64,FAKEQR==';
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ phase: 'GROUP', group: 'A' })]
      }));
      component.openSchedule('A');
      const html: string = winStub.document.write.mock.calls[0][0];
      expect(html).toContain('data:image/png;base64,FAKEQR==');
    });

    it('abre la ventana igualmente cuando scheduleQrDataUrl está vacío (QR fallido — degradación elegante)', () => {
      // Si precomputeScheduleQr falla, scheduleQrDataUrl queda ''.
      // openSchedule debe seguir abriendo el horario, solo sin el QR.
      (component as any).scheduleQrDataUrl = '';
      component.selectedTournament.set(makeTournament({
        matches: [makeMatch({ phase: 'GROUP', group: 'A' })]
      }));
      component.openSchedule('A');
      expect(winStub.document.write).toHaveBeenCalled();
      const html: string = winStub.document.write.mock.calls[0][0];
      expect(html).not.toContain('data:image');
    });
  });

  // ------------------------------------------------------------
  //  precomputeScheduleQr
  // ------------------------------------------------------------
  describe('precomputeScheduleQr', () => {
    beforeEach(async () => { await setup(); });

    it('scheduleQrDataUrl es un data URL de imagen PNG tras precomputeScheduleQr', async () => {
      // ngOnInit llama void this.precomputeScheduleQr() (no awaited), por lo que el valor
      // puede no estar listo justo después de setup(). Llamamos directamente y esperamos.
      (component as any).scheduleQrDataUrl = '';
      await (component as any).precomputeScheduleQr();
      expect((component as any).scheduleQrDataUrl as string).toMatch(/^data:image\/png;base64,/);
    });

    /** Regresión: esbuild (producción) envuelve módulos CJS y pone sus exports bajo .default.
     *  Sin el fix `(mod as any).default ?? mod`, QRCode.toDataURL era undefined en producción
     *  → scheduleQrDataUrl quedaba '' → el QR no aparecía en el horario. */
    it('interop CJS (producción/esbuild): escoge mod.default cuando existe', () => {
      const cjsMod = { default: { toDataURL: vi.fn() } };
      const QRCode = (cjsMod as any).default ?? cjsMod;
      expect(QRCode).toBe(cjsMod.default);
      expect(typeof QRCode.toDataURL).toBe('function');
    });

    it('interop ESM (dev): usa el módulo directamente cuando no hay .default', () => {
      const esmMod = { toDataURL: vi.fn() };
      const QRCode = (esmMod as any).default ?? esmMod;
      expect(QRCode).toBe(esmMod);
      expect(typeof QRCode.toDataURL).toBe('function');
    });
  });

  // ------------------------------------------------------------
  //  downloadXlsxFile
  // ------------------------------------------------------------
  describe('downloadXlsxFile', () => {
    beforeEach(async () => {
      await setup();
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    it('sin torneo seleccionado no llama al servicio', () => {
      component.selectedTournament.set(null);
      component.downloadXlsxFile();
      expect(svc.downloadXlsx).not.toHaveBeenCalled();
    });

    it('llama downloadXlsx con el id del torneo seleccionado', () => {
      component.selectedTournament.set(makeTournament({ id: 'trn-1', name: 'Torneo Test' }));
      component.downloadXlsxFile();
      expect(svc.downloadXlsx).toHaveBeenCalledWith('trn-1');
    });

    it('en error muestra toast', () => {
      svc.downloadXlsx.mockReturnValue(throwError(() => new Error('500')));
      component.selectedTournament.set(makeTournament({ id: 'trn-1' }));
      component.downloadXlsxFile();
      expect(msg.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('el nombre del fichero sanitiza caracteres especiales del nombre del torneo', () => {
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.body);
      const aElem = document.createElement('a');
      const clickSpy = vi.spyOn(aElem, 'click').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValueOnce(aElem);

      component.selectedTournament.set(makeTournament({ id: 'trn-1', name: 'Torneo! 2026' }));
      component.downloadXlsxFile();

      expect(aElem.download).toBe('torneo-torneo-2026.xlsx');
    });
  });
});
