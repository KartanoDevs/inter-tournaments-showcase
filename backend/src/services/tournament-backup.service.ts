import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx-js-style';
import { DropboxUploader } from './dropbox-uploader';

export type BackupTrigger = 'draw' | 'undo_draw' | 'match_update' | 'knockout' | 'manual' | 'restore';

export interface TournamentBackupMeta {
  filename: string;
  trigger: BackupTrigger;
  triggerDetail: string;
  createdAt: string;
  sizeBytes: number;
}

export interface TournamentSnapshot {
  version: 1;
  createdAt: string;
  trigger: BackupTrigger;
  triggerDetail: string;
  tournament: {
    id: string;
    name: string;
    date: string | null;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
  };
  teams: Array<{
    id: string;
    name: string;
    group: string | null;
    drawOrder: number | null;
    tournamentId: string;
    createdAt: string;
  }>;
  matches: Array<{
    id: string;
    tournamentId: string;
    phase: string;
    group: string | null;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number | null;
    awayScore: number | null;
    played: boolean;
    updatedAt: string;
  }>;
}

const MAX_SNAPSHOTS = 100;

export class TournamentBackupService {
  private readonly backupRoot = path.join(process.cwd(), 'public', 'uploads', 'tournament-backups');

  constructor(private readonly uploader?: DropboxUploader) {}

  private backupDir(tournamentId: string): string {
    return path.join(this.backupRoot, tournamentId);
  }

  private ensureDir(tournamentId: string): void {
    fs.mkdirSync(this.backupDir(tournamentId), { recursive: true });
  }

  private safeFilePath(tournamentId: string, filename: string): string {
    if (!/^snapshot-[a-zA-Z0-9._-]+\.json$/.test(filename)) {
      throw new Error('Nombre de archivo inválido');
    }
    const dir = path.resolve(this.backupDir(tournamentId));
    const filePath = path.resolve(path.join(dir, filename));
    if (!filePath.startsWith(dir + path.sep)) {
      throw new Error('Acceso denegado');
    }
    return filePath;
  }

  createSnapshot(
    fullTournament: any,
    tournamentId: string,
    trigger: BackupTrigger,
    triggerDetail = ''
  ): void {
    this.ensureDir(tournamentId);
    const now = new Date();
    const isoForFilename = now.toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${isoForFilename}-${trigger}.json`;
    const dir = path.resolve(this.backupDir(tournamentId));
    const filePath = path.join(dir, filename);

    const snapshot: TournamentSnapshot = {
      version: 1,
      createdAt: now.toISOString(),
      trigger,
      triggerDetail,
      tournament: {
        id: fullTournament.id,
        name: fullTournament.name,
        date: fullTournament.date ? new Date(fullTournament.date).toISOString() : null,
        isActive: fullTournament.isActive,
        isDeleted: fullTournament.isDeleted,
        createdAt: new Date(fullTournament.createdAt).toISOString(),
        updatedAt: new Date(fullTournament.updatedAt).toISOString(),
      },
      teams: (fullTournament.teams ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        group: t.group ?? null,
        drawOrder: t.drawOrder ?? null,
        tournamentId: t.tournamentId,
        createdAt: new Date(t.createdAt).toISOString(),
      })),
      matches: (fullTournament.matches ?? []).map((m: any) => ({
        id: m.id,
        tournamentId: m.tournamentId,
        phase: m.phase,
        group: m.group ?? null,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore ?? null,
        awayScore: m.awayScore ?? null,
        played: m.played ?? false,
        updatedAt: new Date(m.updatedAt).toISOString(),
      })),
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    this.writeCsv(fullTournament, path.join(dir, 'current.csv'));

    if (this.uploader) {
      const jsonBuffer = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8');
      const xlsxBuffer = this.generateXlsxBuffer(fullTournament, {});
      this.uploader
        .uploadSnapshot(tournamentId, filename, jsonBuffer, xlsxBuffer)
        .then(() => console.log(`[dropbox-upload] OK — torneo ${tournamentId} (${trigger})`))
        .catch(err => console.error('[dropbox-upload]', err));
    }

    this.pruneSnapshots(tournamentId);
  }

  listSnapshots(tournamentId: string): TournamentBackupMeta[] {
    const dir = this.backupDir(tournamentId);
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'));

    const metas: TournamentBackupMeta[] = files.map(filename => {
      const filePath = path.join(dir, filename);
      const stats = fs.statSync(filePath);
      let createdAt = '';
      let trigger: BackupTrigger = 'manual';
      let triggerDetail = '';
      try {
        const data: TournamentSnapshot = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        createdAt = data.createdAt;
        trigger = data.trigger;
        triggerDetail = data.triggerDetail ?? '';
      } catch {
        createdAt = new Date(stats.mtime).toISOString();
        // Extraer trigger del propio nombre de fichero como fallback
        const withoutExt = filename.slice(0, -'.json'.length);
        const lastDash = withoutExt.lastIndexOf('-');
        if (lastDash !== -1) trigger = withoutExt.slice(lastDash + 1) as BackupTrigger;
      }
      return { filename, trigger, triggerDetail, createdAt, sizeBytes: stats.size };
    });

    return metas.sort((a, b) => b.filename.localeCompare(a.filename));
  }

  readSnapshot(tournamentId: string, filename: string): TournamentSnapshot {
    const filePath = this.safeFilePath(tournamentId, filename);
    if (!fs.existsSync(filePath)) throw new Error('Snapshot no encontrado');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  deleteSnapshot(tournamentId: string, filename: string): void {
    const filePath = this.safeFilePath(tournamentId, filename);
    if (!fs.existsSync(filePath)) throw new Error('Snapshot no encontrado');
    fs.unlinkSync(filePath);
  }

  getCsvContent(tournamentId: string): string | null {
    const csvPath = path.join(this.backupDir(tournamentId), 'current.csv');
    if (!fs.existsSync(csvPath)) return null;
    return fs.readFileSync(csvPath, 'utf-8');
  }

  private pruneSnapshots(tournamentId: string): void {
    const dir = this.backupDir(tournamentId);
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort(); // ascending = oldest first
    if (files.length > MAX_SNAPSHOTS) {
      files.slice(0, files.length - MAX_SNAPSHOTS).forEach(f =>
        fs.unlinkSync(path.join(dir, f))
      );
    }
  }

  generateXlsxBuffer(
    fullTournament: any,
    standings: Record<string, Array<{
      teamName: string; played: number; wins: number; pf: number; pc: number; total: number;
    }>>
  ): Buffer {
    const S_TITLE  = { fill: { fgColor: { rgb: '1F3864' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 14 }, alignment: { horizontal: 'center', vertical: 'center' } };
    const S_SECT   = { fill: { fgColor: { rgb: '2E75B6' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' } };
    const S_HDR    = { fill: { fgColor: { rgb: 'BDD7EE' } }, font: { bold: true, color: { rgb: '1F3864' }, sz: 10 }, alignment: { horizontal: 'center' } };
    const S_HDR_L  = { ...S_HDR, alignment: { horizontal: 'left' } };
    const S_ODD    = { fill: { fgColor: { rgb: 'EBF3FB' } } };
    const S_EVEN   = { fill: { fgColor: { rgb: 'FFFFFF' } } };
    const S_RESULT = { font: { bold: true }, alignment: { horizontal: 'center' } };
    const NCOLS = 7;

    const wsData: any[][] = [];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const rowH: { hpx?: number }[] = [];
    let r = 0;

    const cell = (v: any, s: any = {}): any => ({ v: v ?? '', t: typeof v === 'number' ? 'n' : 's', s });
    const blank = (): any[] => Array(NCOLS).fill(null).map(() => cell(''));

    const pushSection = (text: string, style: any, hpx = 22): void => {
      merges.push({ s: { r, c: 0 }, e: { r, c: NCOLS - 1 } });
      const row = blank(); row[0] = cell(text, style);
      wsData.push(row); rowH.push({ hpx }); r++;
    };
    const pushEmpty = (): void => { wsData.push(blank()); rowH.push({}); r++; };

    const teamName = (match: any, side: 'home' | 'away'): string => {
      const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
      return match[`${side}Team`]?.name
        ?? fullTournament.teams?.find((t: any) => t.id === teamId)?.name
        ?? teamId ?? '';
    };

    const matchResult = (m: any): string =>
      m.played && m.homeScore !== null && m.awayScore !== null
        ? `${m.homeScore} - ${m.awayScore}`
        : 'Pendiente';

    const pushMatchRows = (matches: any[]): void => {
      const hdr = blank();
      hdr[0] = cell('Partido', S_HDR);
      hdr[1] = cell('Equipo Local', S_HDR_L);
      hdr[2] = cell('Resultado', S_HDR);
      hdr[3] = cell('Equipo Visitante', S_HDR_L);
      wsData.push(hdr); rowH.push({}); r++;

      matches.forEach((m, idx) => {
        const base = idx % 2 === 0 ? S_EVEN : S_ODD;
        const row = blank();
        row[0] = cell(idx + 1,          { ...base, alignment: { horizontal: 'center' } });
        row[1] = cell(teamName(m, 'home'), base);
        row[2] = cell(matchResult(m),   { ...base, ...S_RESULT });
        row[3] = cell(teamName(m, 'away'), base);
        wsData.push(row); rowH.push({}); r++;
      });
    };

    // ── Título ──────────────────────────────────────────────────────
    const dateStr = fullTournament.date
      ? new Date(fullTournament.date).toLocaleDateString('es-ES')
      : '';
    const title = dateStr
      ? `${(fullTournament.name ?? 'TORNEO').toUpperCase()} — ${dateStr}`
      : (fullTournament.name ?? 'TORNEO').toUpperCase();
    pushSection(title, S_TITLE, 32);
    pushEmpty();

    // ── Fase de Grupos ───────────────────────────────────────────────
    const groupMatches = (fullTournament.matches ?? []).filter((m: any) => m.phase === 'GROUP');
    if (groupMatches.length > 0) {
      pushSection('FASE DE GRUPOS', S_SECT);
      pushEmpty();
      for (const g of ['A', 'B']) {
        const gm = groupMatches.filter((m: any) => m.group === g);
        if (gm.length === 0) continue;
        pushSection(`GRUPO ${g}`, S_SECT);
        pushMatchRows(gm);
        pushEmpty();
      }
    }

    // ── Clasificación ────────────────────────────────────────────────
    const hasStandings = (['A', 'B'] as const).some(g => (standings[g]?.length ?? 0) > 0);
    if (hasStandings) {
      pushSection('CLASIFICACIÓN DE GRUPOS', S_SECT);
      pushEmpty();
      for (const g of ['A', 'B']) {
        const sRows = standings[g] ?? [];
        if (sRows.length === 0) continue;
        pushSection(`GRUPO ${g}`, S_SECT);
        wsData.push([
          cell('Pos',   S_HDR), cell('Equipo', S_HDR_L), cell('PJ', S_HDR),
          cell('G',     S_HDR), cell('PF',     S_HDR),   cell('PC', S_HDR), cell('Dif', S_HDR),
        ]); rowH.push({}); r++;
        sRows.forEach((s, idx) => {
          const base = idx % 2 === 0 ? S_EVEN : S_ODD;
          const center = { alignment: { horizontal: 'center' } };
          wsData.push([
            cell(idx + 1,  { ...base, ...center }),
            cell(s.teamName, base),
            cell(s.played, { ...base, ...center }),
            cell(s.wins,   { ...base, ...center }),
            cell(s.pf,     { ...base, ...center }),
            cell(s.pc,     { ...base, ...center }),
            cell(s.total,  { ...base, ...center, font: { bold: true } }),
          ]); rowH.push({}); r++;
        });
        pushEmpty();
      }
    }

    // ── Fase Eliminatoria ────────────────────────────────────────────
    const phaseLabel: Record<string, string> = {
      QF: 'CUARTOS DE FINAL', SF: 'SEMIFINALES', THIRD: 'TERCER PUESTO', FINAL: 'FINAL'
    };
    const knockoutMatches = (fullTournament.matches ?? []).filter((m: any) => m.phase !== 'GROUP');
    if (knockoutMatches.length > 0) {
      pushSection('FASE ELIMINATORIA', S_SECT);
      pushEmpty();
      for (const phase of ['QF', 'SF', 'THIRD', 'FINAL']) {
        const pm = knockoutMatches.filter((m: any) => m.phase === phase);
        if (pm.length === 0) continue;
        pushSection(phaseLabel[phase], S_SECT);
        pushMatchRows(pm);
        pushEmpty();
      }
    }

    // ── Construir workbook ───────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;
    ws['!cols']   = [{ wpx: 60 }, { wpx: 190 }, { wpx: 90 }, { wpx: 190 }, { wpx: 50 }, { wpx: 50 }, { wpx: 55 }];
    ws['!rows']   = rowH;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Torneo');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private csvEscape(v: string): string {
    if (/[",\n\r]/.test(v)) {
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return v;
  }

  private writeCsv(fullTournament: any, csvPath: string): void {
    const header = 'TORNEO,FASE,GRUPO,LOCAL,GOLES_LOCAL,VISITANTE,GOLES_VISITANTE,JUGADO,ACTUALIZADO';
    const rows: string[] = [header];

    for (const match of (fullTournament.matches ?? [])) {
      const homeTeamName: string =
        match.homeTeam?.name ??
        fullTournament.teams?.find((t: any) => t.id === match.homeTeamId)?.name ??
        match.homeTeamId ?? '';
      const awayTeamName: string =
        match.awayTeam?.name ??
        fullTournament.teams?.find((t: any) => t.id === match.awayTeamId)?.name ??
        match.awayTeamId ?? '';

      const updatedAt = match.updatedAt
        ? new Date(match.updatedAt).toISOString().replace('T', ' ').slice(0, 19)
        : '';

      rows.push([
        this.csvEscape(fullTournament.name ?? ''),
        this.csvEscape(match.phase ?? ''),
        this.csvEscape(match.group ?? ''),
        this.csvEscape(homeTeamName),
        match.homeScore != null ? String(match.homeScore) : '',
        this.csvEscape(awayTeamName),
        match.awayScore != null ? String(match.awayScore) : '',
        match.played ? 'SI' : 'NO',
        this.csvEscape(updatedAt),
      ].join(','));
    }

    const tmp = csvPath + '.tmp';
    fs.writeFileSync(tmp, rows.join('\n'), 'utf-8');
    fs.renameSync(tmp, csvPath);
  }
}
