import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TournamentService } from './tournament.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/tournaments`;

describe('TournamentService', () => {
  let service: TournamentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TournamentService
      ]
    });
    service = TestBed.inject(TournamentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debería crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('getAll', () => {
    it('GET /tournaments y propaga la respuesta', () => {
      const mock = { status: 'success', data: [] };
      let received: any = null;
      service.getAll().subscribe(res => (received = res));

      const req = http.expectOne(BASE);
      expect(req.request.method).toBe('GET');
      req.flush(mock);
      expect(received).toEqual(mock);
    });
  });

  describe('getById', () => {
    it('GET /tournaments/:id', () => {
      service.getById('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('getStandings', () => {
    it('GET /tournaments/:id/standings', () => {
      service.getStandings('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/standings`);
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'success', data: { A: [], B: [] } });
    });
  });

  describe('create', () => {
    it('POST /tournaments con payload', () => {
      const payload = { name: 'Torneo', date: '2026-01-01T00:00:00.000Z' };
      service.create(payload).subscribe();
      const req = http.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ status: 'success', data: {} });
    });

    it('acepta date null', () => {
      service.create({ name: 'X', date: null }).subscribe();
      const req = http.expectOne(BASE);
      expect(req.request.body).toEqual({ name: 'X', date: null });
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('update', () => {
    it('PATCH /tournaments/:id con payload parcial', () => {
      const payload = { name: 'Nuevo', isActive: true };
      service.update('trn-1', payload).subscribe();
      const req = http.expectOne(`${BASE}/trn-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('delete', () => {
    it('DELETE /tournaments/:id', () => {
      service.delete('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('addTeam', () => {
    it('POST /tournaments/:id/teams con { name }', () => {
      service.addTeam('trn-1', 'Equipo X').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/teams`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'Equipo X' });
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('removeTeam', () => {
    it('DELETE /tournaments/:tid/teams/:teamId', () => {
      service.removeTeam('trn-1', 'team-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/teams/team-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('draw', () => {
    it('POST /tournaments/:id/draw con body vacío', () => {
      service.draw('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/draw`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('undoDraw', () => {
    it('DELETE /tournaments/:id/draw', () => {
      service.undoDraw('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/draw`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('updateMatch', () => {
    it('PATCH /tournaments/:tid/matches/:matchId con scores', () => {
      const payload = { homeScore: 21, awayScore: 18 };
      service.updateMatch('trn-1', 'match-1', payload).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/matches/match-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);
      req.flush({ status: 'success', data: {} });
    });

    it('acepta scores null', () => {
      service.updateMatch('trn-1', 'match-1', { homeScore: null, awayScore: null }).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/matches/match-1`);
      expect(req.request.body).toEqual({ homeScore: null, awayScore: null });
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('generateKnockout', () => {
    it('POST /tournaments/:id/knockout con body vacío', () => {
      service.generateKnockout('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/knockout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ status: 'success', data: {} });
    });
  });

  // ── Módulo de Seguridad ──────────────────────────────────────────────────

  describe('listBackups', () => {
    it('GET /tournaments/:id/backups', () => {
      service.listBackups('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/backups`);
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'success', data: [] });
    });
  });

  describe('createManualBackup', () => {
    it('POST /tournaments/:id/backups con body vacío', () => {
      service.createManualBackup('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/backups`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('deleteBackup', () => {
    it('DELETE /tournaments/:id/backups/:filename (URL-encoded)', () => {
      const filename = 'snapshot-2026-01-01T00-00-00-000Z-draw.json';
      service.deleteBackup('trn-1', filename).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/backups/${encodeURIComponent(filename)}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('restore', () => {
    it('POST /tournaments/:id/restore con { filename }', () => {
      const filename = 'snapshot-2026-01-01T00-00-00-000Z-draw.json';
      service.restore('trn-1', filename).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/restore`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ filename });
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('uploadBackup', () => {
    it('POST /tournaments/:id/backups/upload con FormData', () => {
      const file = new File(['{}'], 'snap.json', { type: 'application/json' });
      service.uploadBackup('trn-1', file).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/backups/upload`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeInstanceOf(FormData);
      req.flush({ status: 'success', data: {} });
    });
  });

  describe('downloadBackup', () => {
    it('GET /tournaments/:id/backups/:filename con responseType blob', () => {
      const filename = 'snapshot-2026-01-01T00-00-00-000Z-draw.json';
      service.downloadBackup('trn-1', filename).subscribe();
      const req = http.expectOne(`${BASE}/trn-1/backups/${encodeURIComponent(filename)}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('downloadCsv', () => {
    it('GET /tournaments/:id/export/current.csv con responseType blob', () => {
      service.downloadCsv('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/export/current.csv`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });

  describe('downloadXlsx', () => {
    it('GET /tournaments/:id/export/xlsx con responseType blob', () => {
      service.downloadXlsx('trn-1').subscribe();
      const req = http.expectOne(`${BASE}/trn-1/export/xlsx`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob());
    });
  });
});
