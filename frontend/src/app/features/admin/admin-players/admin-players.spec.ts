import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { AdminPlayers } from './admin-players';
import { PlayerService } from '../../../shared/services/player.service';
import { TeamService } from '../../../shared/services/team.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Player, VolleyballPosition } from '../../../shared/models/player.model';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p-1',
    firstName: 'Juan',
    lastName: 'García',
    number: 1,
    position: VolleyballPosition.UNASSIGNED,
    teamId: 'team-1',
    isActive: true,
    isPoke: false,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminPlayers — paginador', () => {
  let component: AdminPlayers;
  let fixture: ComponentFixture<AdminPlayers>;

  async function setup(players: Player[] = []) {
    await TestBed.configureTestingModule({
      imports: [AdminPlayers],
      providers: [
        {
          provide: PlayerService,
          useValue: { getPlayers: vi.fn().mockReturnValue(of({ data: players })) }
        },
        {
          provide: TeamService,
          useValue: { getAllTeams: vi.fn().mockReturnValue(of({ data: [] })) }
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn(), close: vi.fn() }
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPlayers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── Valores iniciales ─────────────────────────────────────────────────────

  describe('valores iniciales', () => {
    it('paginatorFirst inicia en 0', async () => {
      await setup();
      expect(component.paginatorFirst()).toBe(0);
    });

    it('paginatorRows inicia en 10', async () => {
      await setup();
      expect(component.paginatorRows()).toBe(10);
    });
  });

  // ── onPageChange ──────────────────────────────────────────────────────────

  describe('onPageChange', () => {
    it('actualiza paginatorFirst y paginatorRows', async () => {
      await setup();
      component.onPageChange({ first: 20, rows: 25 });
      expect(component.paginatorFirst()).toBe(20);
      expect(component.paginatorRows()).toBe(25);
    });

    it('puede volver a la primera página', async () => {
      await setup();
      component.onPageChange({ first: 10, rows: 10 });
      component.onPageChange({ first: 0, rows: 10 });
      expect(component.paginatorFirst()).toBe(0);
    });
  });

  // ── pagedPlayers (computed) ───────────────────────────────────────────────

  describe('pagedPlayers', () => {
    it('devuelve [] cuando no hay jugadores', async () => {
      await setup([]);
      expect(component.pagedPlayers()).toEqual([]);
    });

    it('muestra los primeros 10 por defecto', async () => {
      const players = Array.from({ length: 15 }, (_, i) => makePlayer({ id: `p-${i}` }));
      await setup(players);
      expect(component.pagedPlayers().length).toBe(10);
    });

    it('muestra la segunda página correctamente', async () => {
      const players = Array.from({ length: 15 }, (_, i) => makePlayer({ id: `p-${i}` }));
      await setup(players);
      component.onPageChange({ first: 10, rows: 10 });
      expect(component.pagedPlayers().length).toBe(5);
      expect(component.pagedPlayers()[0].id).toBe('p-10');
    });

    it('respeta el rows personalizado', async () => {
      const players = Array.from({ length: 30 }, (_, i) => makePlayer({ id: `p-${i}` }));
      await setup(players);
      component.onPageChange({ first: 0, rows: 25 });
      expect(component.pagedPlayers().length).toBe(25);
    });

    it('reactualiza cuando cambia la página', async () => {
      const players = Array.from({ length: 20 }, (_, i) => makePlayer({ id: `p-${i}` }));
      await setup(players);
      component.onPageChange({ first: 0, rows: 10 });
      expect(component.pagedPlayers()[0].id).toBe('p-0');
      component.onPageChange({ first: 10, rows: 10 });
      expect(component.pagedPlayers()[0].id).toBe('p-10');
    });
  });
});
