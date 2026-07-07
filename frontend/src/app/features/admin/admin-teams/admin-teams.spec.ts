import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { AdminTeams } from './admin-teams';
import { TeamService } from '../../../shared/services/team.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { Team } from '../../../shared/models/team.model';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Equipo Ejemplo',
    shortName: 'EJM',
    logo: null,
    competitionType: 'MALE',
    isActive: true,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AdminTeams — paginador', () => {
  let component: AdminTeams;
  let fixture: ComponentFixture<AdminTeams>;

  async function setup(teams: Team[] = []) {
    await TestBed.configureTestingModule({
      imports: [AdminTeams],
      providers: [
        {
          provide: TeamService,
          useValue: {
            getAllTeams: vi.fn().mockReturnValue(of({ data: teams })),
            createTeam: vi.fn(),
            updateTeam: vi.fn(),
          },
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn(), close: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTeams);
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
      component.onPageChange({ first: 10, rows: 25 });
      expect(component.paginatorFirst()).toBe(10);
      expect(component.paginatorRows()).toBe(25);
    });

    it('puede volver a la primera página', async () => {
      await setup();
      component.onPageChange({ first: 20, rows: 10 });
      component.onPageChange({ first: 0, rows: 10 });
      expect(component.paginatorFirst()).toBe(0);
    });
  });

  // ── pagedTeams (computed) ─────────────────────────────────────────────────

  describe('pagedTeams', () => {
    it('devuelve [] cuando no hay equipos', async () => {
      await setup([]);
      expect(component.pagedTeams()).toEqual([]);
    });

    it('muestra los primeros 10 por defecto', async () => {
      const teams = Array.from({ length: 15 }, (_, i) => makeTeam({ id: `team-${i}` }));
      await setup(teams);
      expect(component.pagedTeams().length).toBe(10);
    });

    it('muestra la segunda página correctamente', async () => {
      const teams = Array.from({ length: 15 }, (_, i) => makeTeam({ id: `team-${i}` }));
      await setup(teams);
      component.onPageChange({ first: 10, rows: 10 });
      expect(component.pagedTeams().length).toBe(5);
      expect(component.pagedTeams()[0].id).toBe('team-10');
    });

    it('respeta el rows personalizado', async () => {
      const teams = Array.from({ length: 30 }, (_, i) => makeTeam({ id: `team-${i}` }));
      await setup(teams);
      component.onPageChange({ first: 0, rows: 25 });
      expect(component.pagedTeams().length).toBe(25);
    });

    it('reactualiza cuando cambia la página', async () => {
      const teams = Array.from({ length: 20 }, (_, i) => makeTeam({ id: `team-${i}` }));
      await setup(teams);
      component.onPageChange({ first: 0, rows: 10 });
      expect(component.pagedTeams()[0].id).toBe('team-0');
      component.onPageChange({ first: 10, rows: 10 });
      expect(component.pagedTeams()[0].id).toBe('team-10');
    });
  });
});
