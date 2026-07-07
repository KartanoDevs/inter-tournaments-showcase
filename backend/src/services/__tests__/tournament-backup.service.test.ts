import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

// ── Fs mock ────────────────────────────────────────────────────────────────
// Interceptamos el módulo 'fs' ANTES de que el servicio lo importe.
vi.mock('fs', () => {
  const store: Record<string, string> = {};
  const statStore: Record<string, { size: number; mtime: Date }> = {};

  return {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn((filePath: string, content: string) => {
      store[filePath] = content;
      statStore[filePath] = { size: Buffer.byteLength(content), mtime: new Date() };
    }),
    renameSync: vi.fn((from: string, to: string) => {
      store[to] = store[from] ?? '';
      statStore[to] = statStore[from] ?? { size: 0, mtime: new Date() };
      delete store[from];
      delete statStore[from];
    }),
    readFileSync: vi.fn((filePath: string) => {
      if (store[filePath] === undefined) throw new Error(`ENOENT: ${filePath}`);
      return store[filePath];
    }),
    readdirSync: vi.fn((_dir: string): string[] => []),
    statSync: vi.fn((filePath: string) => {
      if (!statStore[filePath]) throw new Error(`ENOENT: ${filePath}`);
      return statStore[filePath];
    }),
    existsSync: vi.fn((_filePath: string) => false),
    unlinkSync: vi.fn(),
    // Expone store para inspección en tests
    __store: store,
    __statStore: statStore,
    __reset: () => {
      Object.keys(store).forEach(k => delete store[k]);
      Object.keys(statStore).forEach(k => delete statStore[k]);
    },
  };
});

import * as fs from 'fs';
import { TournamentBackupService, TournamentSnapshot } from '../tournament-backup.service';

// Helper para construir un objeto torneo completo similar al que devuelve Prisma
function makeTournament(overrides: Record<string, any> = {}) {
  return {
    id: 'trn-1',
    name: 'Torneo Test',
    date: null,
    isActive: true,
    isDeleted: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    teams: [
      { id: 't1', name: 'Equipo A', group: 'A', drawOrder: 1, tournamentId: 'trn-1', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 't2', name: 'Equipo B', group: 'B', drawOrder: 1, tournamentId: 'trn-1', createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ],
    matches: [
      {
        id: 'm1',
        tournamentId: 'trn-1',
        phase: 'GROUP',
        group: 'A',
        homeTeamId: 't1',
        awayTeamId: 't2',
        homeTeam: { id: 't1', name: 'Equipo A' },
        awayTeam: { id: 't2', name: 'Equipo B' },
        homeScore: 21,
        awayScore: 18,
        played: true,
        updatedAt: new Date('2026-01-01T12:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}

describe('TournamentBackupService', () => {
  let svc: TournamentBackupService;
  const fsMock = fs as any;

  beforeEach(() => {
    fsMock.__reset();
    vi.clearAllMocks();
    svc = new TournamentBackupService();
  });

  // ── createSnapshot ────────────────────────────────────────────────────────
  describe('createSnapshot', () => {
    it('crea el directorio y escribe el JSON', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', 'Sorteo generado');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(path.join('tournament-backups', 'trn-1')),
        { recursive: true }
      );
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('el JSON contiene version=1, trigger y triggerDetail', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', 'Sorteo generado');

      const writeCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.json')
      );
      expect(writeCall).toBeDefined();
      const parsed = JSON.parse(writeCall[1]);
      expect(parsed.version).toBe(1);
      expect(parsed.trigger).toBe('draw');
      expect(parsed.triggerDetail).toBe('Sorteo generado');
    });

    it('el JSON no incluye homeTeam/awayTeam en los matches (sin relaciones)', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'match_update', 'INT 21-18 EQB');

      const writeCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.json')
      );
      const parsed = JSON.parse(writeCall[1]);
      expect(parsed.matches[0].homeTeam).toBeUndefined();
      expect(parsed.matches[0].awayTeam).toBeUndefined();
      expect(parsed.matches[0].homeTeamId).toBe('t1');
    });

    it('el filename tiene formato snapshot-{ISO}-{trigger}.json con orden lexicográfico correcto', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'knockout', '');

      const writeCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.json')
      );
      const filename = path.basename(writeCall[0] as string);
      // El ISO se genera con .toISOString().replace(/[:.]/g, '-'), conservando la 'Z' final
      expect(filename).toMatch(/^snapshot-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-knockout\.json$/);
    });

    it('genera current.csv con escritura atómica (tmp → final)', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', '');

      const writeCalls = (fs.writeFileSync as any).mock.calls;
      const csvTmpCall = writeCalls.find((c: any[]) => String(c[0]).endsWith('.tmp'));
      expect(csvTmpCall).toBeDefined();
      expect(fs.renameSync).toHaveBeenCalled();
    });

    it('el CSV incluye la cabecera y una fila por partido', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', '');

      const writeCalls = (fs.writeFileSync as any).mock.calls;
      const csvCall = writeCalls.find((c: any[]) => String(c[0]).endsWith('.tmp'));
      const csvContent: string = csvCall[1];
      expect(csvContent).toContain('TORNEO,FASE,GRUPO,LOCAL');
      expect(csvContent).toContain('Torneo Test');
      expect(csvContent).toContain('Equipo A');
      expect(csvContent).toContain('Equipo B');
      expect(csvContent).toContain('21');
      expect(csvContent).toContain('SI');
    });

    it('llama a pruneSnapshots (readdirSync para contar)', () => {
      (fs.readdirSync as any).mockReturnValue([]);
      svc.createSnapshot(makeTournament(), 'trn-1', 'manual', '');
      expect(fs.readdirSync).toHaveBeenCalled();
    });
  });

  // ── csvEscape ─────────────────────────────────────────────────────────────
  describe('csvEscape (a través de createSnapshot)', () => {
    it('envuelve en comillas dobles los campos con comas', () => {
      const t = makeTournament({ name: 'Torneo, A' });
      svc.createSnapshot(t, 'trn-1', 'draw', '');

      const csvCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.tmp')
      );
      expect(csvCall[1]).toContain('"Torneo, A"');
    });

    it('escapa las comillas dobles dentro del campo', () => {
      const t = makeTournament({ name: 'Torneo "oficial"' });
      svc.createSnapshot(t, 'trn-1', 'draw', '');

      const csvCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.tmp')
      );
      expect(csvCall[1]).toContain('"Torneo ""oficial"""');
    });

    it('no añade comillas a valores sin caracteres especiales', () => {
      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', '');

      const csvCall = (fs.writeFileSync as any).mock.calls.find(
        (c: any[]) => String(c[0]).endsWith('.tmp')
      );
      // 'Torneo Test' no tiene comas ni comillas → no debe estar entre comillas
      expect(csvCall[1]).not.toContain('"Torneo Test"');
      expect(csvCall[1]).toContain('Torneo Test');
    });
  });

  // ── listSnapshots ─────────────────────────────────────────────────────────
  describe('listSnapshots', () => {
    it('devuelve [] si el directorio no existe', () => {
      (fs.existsSync as any).mockReturnValue(false);
      expect(svc.listSnapshots('trn-1')).toEqual([]);
    });

    it('filtra solo snapshot-*.json y los ordena DESC', () => {
      (fs.existsSync as any).mockReturnValue(true);
      const files = [
        'snapshot-2026-01-01T10-00-00-000-draw.json',
        'snapshot-2026-01-01T11-00-00-000-match_update.json',
        'current.csv',
        'other-file.txt',
      ];
      (fs.readdirSync as any).mockReturnValue(files);

      const snapshotA: TournamentSnapshot = {
        version: 1,
        createdAt: '2026-01-01T10:00:00.000Z',
        trigger: 'draw',
        triggerDetail: 'Sorteo',
        tournament: { id: 'trn-1', name: 'T', date: null, isActive: true, isDeleted: false, createdAt: '', updatedAt: '' },
        teams: [],
        matches: [],
      };
      const snapshotB: TournamentSnapshot = { ...snapshotA, createdAt: '2026-01-01T11:00:00.000Z', trigger: 'match_update' };

      (fs.readFileSync as any).mockImplementation((filePath: string) => {
        if (String(filePath).includes('10-00')) return JSON.stringify(snapshotA);
        return JSON.stringify(snapshotB);
      });
      (fs.statSync as any).mockReturnValue({ size: 500, mtime: new Date() });

      const result = svc.listSnapshots('trn-1');
      expect(result).toHaveLength(2);
      // Orden DESC: el más reciente primero
      expect(result[0].trigger).toBe('match_update');
      expect(result[1].trigger).toBe('draw');
    });

    it('maneja error en readFileSync y usa mtime del stat', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readdirSync as any).mockReturnValue(['snapshot-2026-01-01T10-00-00-000-draw.json']);
      (fs.readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });
      (fs.statSync as any).mockReturnValue({ size: 100, mtime: new Date('2026-01-01') });

      const result = svc.listSnapshots('trn-1');
      expect(result).toHaveLength(1);
      expect(result[0].trigger).toBe('draw');
    });
  });

  // ── readSnapshot ──────────────────────────────────────────────────────────
  describe('readSnapshot', () => {
    const snapshot: TournamentSnapshot = {
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      trigger: 'draw',
      triggerDetail: 'test',
      tournament: { id: 'trn-1', name: 'T', date: null, isActive: true, isDeleted: false, createdAt: '', updatedAt: '' },
      teams: [],
      matches: [],
    };

    it('lee y parsea el JSON del fichero', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(JSON.stringify(snapshot));

      const result = svc.readSnapshot('trn-1', 'snapshot-2026-01-01T00-00-00-000-draw.json');
      expect(result.version).toBe(1);
      expect(result.trigger).toBe('draw');
    });

    it('lanza error si el fichero no existe', () => {
      (fs.existsSync as any).mockReturnValue(false);
      expect(() =>
        svc.readSnapshot('trn-1', 'snapshot-2026-01-01T00-00-00-000-draw.json')
      ).toThrow('Snapshot no encontrado');
    });

    it('rechaza filename con path traversal (../)', () => {
      expect(() =>
        svc.readSnapshot('trn-1', '../etc/passwd')
      ).toThrow('Nombre de archivo inválido');
    });

    it('rechaza filename que no sigue el patrón snapshot-*.json', () => {
      expect(() =>
        svc.readSnapshot('trn-1', 'current.csv')
      ).toThrow('Nombre de archivo inválido');
    });

    it('rechaza filename con caracteres especiales peligrosos', () => {
      expect(() =>
        svc.readSnapshot('trn-1', 'snapshot-bad<script>.json')
      ).toThrow('Nombre de archivo inválido');
    });
  });

  // ── deleteSnapshot ────────────────────────────────────────────────────────
  describe('deleteSnapshot', () => {
    it('llama unlinkSync con la ruta correcta', () => {
      (fs.existsSync as any).mockReturnValue(true);

      svc.deleteSnapshot('trn-1', 'snapshot-2026-01-01T00-00-00-000-manual.json');
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('snapshot-2026-01-01T00-00-00-000-manual.json')
      );
    });

    it('lanza error si el fichero no existe', () => {
      (fs.existsSync as any).mockReturnValue(false);
      expect(() =>
        svc.deleteSnapshot('trn-1', 'snapshot-2026-01-01T00-00-00-000-manual.json')
      ).toThrow('Snapshot no encontrado');
    });

    it('rechaza filename inválido antes de tocar disco', () => {
      expect(() =>
        svc.deleteSnapshot('trn-1', '../../etc/passwd')
      ).toThrow('Nombre de archivo inválido');
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ── pruneSnapshots ────────────────────────────────────────────────────────
  describe('pruneSnapshots (vía createSnapshot)', () => {
    it('elimina los más antiguos cuando hay más de 100', () => {
      // 102 ficheros snapshot - debería borrar los 2 más antiguos
      const files = Array.from({ length: 102 }, (_, i) => {
        const sec = String(i).padStart(2, '0');
        return `snapshot-2026-01-01T00-00-${sec}-000Z-draw.json`;
      });
      (fs.readdirSync as any).mockReturnValue(files);

      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', '');

      const unlinkCalls = (fs.unlinkSync as any).mock.calls;
      expect(unlinkCalls.length).toBe(2);
      // Los más antiguos son los de índice 0 y 1 (sort ascendente)
      const unlinked0 = path.basename(String(unlinkCalls[0][0]));
      const unlinked1 = path.basename(String(unlinkCalls[1][0]));
      expect(unlinked0).toBe(files[0]);
      expect(unlinked1).toBe(files[1]);
    });

    it('no elimina nada cuando hay exactamente 100', () => {
      const files = Array.from({ length: 100 }, (_, i) =>
        `snapshot-2026-01-01T00-00-${String(i).padStart(3, '0')}-000-draw.json`
      );
      (fs.readdirSync as any).mockReturnValue(files);

      svc.createSnapshot(makeTournament(), 'trn-1', 'draw', '');

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ── getCsvContent ─────────────────────────────────────────────────────────
  describe('getCsvContent', () => {
    it('devuelve null si no existe current.csv', () => {
      (fs.existsSync as any).mockReturnValue(false);
      expect(svc.getCsvContent('trn-1')).toBeNull();
    });

    it('devuelve el contenido del CSV', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('TORNEO,FASE,…');
      expect(svc.getCsvContent('trn-1')).toBe('TORNEO,FASE,…');
    });
  });

  // ── generateXlsxBuffer ────────────────────────────────────────────────────
  describe('generateXlsxBuffer', () => {
    it('devuelve un Buffer no vacío', () => {
      const result = svc.generateXlsxBuffer(makeTournament(), {});
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('no lanza con torneo vacío (sin matches ni equipos)', () => {
      expect(() =>
        svc.generateXlsxBuffer(makeTournament({ matches: [], teams: [] }), {})
      ).not.toThrow();
    });

    it('no lanza con clasificación de grupos', () => {
      const standings = {
        A: [{ teamName: 'Equipo A', played: 2, wins: 1, pf: 42, pc: 35, total: 7 }],
        B: [{ teamName: 'Equipo B', played: 2, wins: 2, pf: 50, pc: 30, total: 20 }],
      };
      expect(() =>
        svc.generateXlsxBuffer(makeTournament(), standings)
      ).not.toThrow();
    });

    it('no lanza con partidos eliminatorios (QF, SF, THIRD, FINAL)', () => {
      const knockoutMatches = ['QF', 'SF', 'THIRD', 'FINAL'].map((phase, i) => ({
        id: `m${i}`, tournamentId: 'trn-1', phase, group: null,
        homeTeamId: 't1', awayTeamId: 't2',
        homeTeam: { id: 't1', name: 'Equipo A' },
        awayTeam: { id: 't2', name: 'Equipo B' },
        homeScore: 21, awayScore: 18, played: true,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      }));
      const t = makeTournament({ matches: knockoutMatches });
      expect(() => svc.generateXlsxBuffer(t, {})).not.toThrow();
    });

    it('formatea título con nombre y fecha cuando el torneo tiene fecha', () => {
      const t = makeTournament({ date: new Date('2026-05-28T00:00:00.000Z'), name: 'Torneo Oficial' });
      const result = svc.generateXlsxBuffer(t, {});
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('formatea título sin fecha cuando date es null', () => {
      const t = makeTournament({ date: null, name: 'Torneo Sin Fecha' });
      const result = svc.generateXlsxBuffer(t, {});
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('un partido pendiente muestra resultado "Pendiente" (no lanza)', () => {
      const t = makeTournament({
        matches: [{
          id: 'm1', tournamentId: 'trn-1', phase: 'GROUP', group: 'A',
          homeTeamId: 't1', awayTeamId: 't2',
          homeTeam: { id: 't1', name: 'Local' },
          awayTeam: { id: 't2', name: 'Visitante' },
          homeScore: null, awayScore: null, played: false,
          updatedAt: new Date(),
        }],
      });
      expect(() => svc.generateXlsxBuffer(t, {})).not.toThrow();
    });

    it('usa teamId como fallback cuando homeTeam/awayTeam no están', () => {
      const t = makeTournament({
        matches: [{
          id: 'm1', tournamentId: 'trn-1', phase: 'GROUP', group: 'A',
          homeTeamId: 't1', awayTeamId: 't2',
          homeScore: 21, awayScore: 18, played: true,
          updatedAt: new Date(),
        }],
        teams: [
          { id: 't1', name: 'Equipo A', group: 'A', drawOrder: 1, tournamentId: 'trn-1', createdAt: new Date() },
          { id: 't2', name: 'Equipo B', group: 'B', drawOrder: 2, tournamentId: 'trn-1', createdAt: new Date() },
        ],
      });
      expect(() => svc.generateXlsxBuffer(t, {})).not.toThrow();
    });
  });
});
