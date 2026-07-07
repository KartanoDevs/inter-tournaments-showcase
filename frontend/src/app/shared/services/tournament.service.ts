import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Tournament, Tournament4v4Team, TournamentMatch, TournamentStandings, TournamentBackup } from '../models/tournament.model';

export interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tournaments`;

  getAll(): Observable<ApiResponse<Tournament[]>> {
    return this.http.get<ApiResponse<Tournament[]>>(this.apiUrl);
  }

  getById(id: string): Observable<ApiResponse<Tournament>> {
    return this.http.get<ApiResponse<Tournament>>(`${this.apiUrl}/${id}`);
  }

  getStandings(id: string): Observable<ApiResponse<TournamentStandings>> {
    return this.http.get<ApiResponse<TournamentStandings>>(`${this.apiUrl}/${id}/standings`);
  }

  create(data: { name: string; date?: string | null }): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(this.apiUrl, data);
  }

  update(id: string, data: { name?: string; date?: string | null; isActive?: boolean }): Observable<ApiResponse<Tournament>> {
    return this.http.patch<ApiResponse<Tournament>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addTeam(tournamentId: string, name: string): Observable<ApiResponse<Tournament4v4Team>> {
    return this.http.post<ApiResponse<Tournament4v4Team>>(`${this.apiUrl}/${tournamentId}/teams`, { name });
  }

  removeTeam(tournamentId: string, teamId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tournamentId}/teams/${teamId}`);
  }

  draw(tournamentId: string): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(`${this.apiUrl}/${tournamentId}/draw`, {});
  }

  undoDraw(tournamentId: string): Observable<ApiResponse<Tournament>> {
    return this.http.delete<ApiResponse<Tournament>>(`${this.apiUrl}/${tournamentId}/draw`);
  }

  updateMatch(
    tournamentId: string,
    matchId: string,
    data: { homeScore?: number | null; awayScore?: number | null; played?: boolean }
  ): Observable<ApiResponse<TournamentMatch>> {
    return this.http.patch<ApiResponse<TournamentMatch>>(
      `${this.apiUrl}/${tournamentId}/matches/${matchId}`,
      data
    );
  }

  generateKnockout(tournamentId: string): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(`${this.apiUrl}/${tournamentId}/knockout`, {});
  }

  listBackups(tournamentId: string): Observable<ApiResponse<TournamentBackup[]>> {
    return this.http.get<ApiResponse<TournamentBackup[]>>(`${this.apiUrl}/${tournamentId}/backups`);
  }

  createManualBackup(tournamentId: string): Observable<ApiResponse<TournamentBackup>> {
    return this.http.post<ApiResponse<TournamentBackup>>(`${this.apiUrl}/${tournamentId}/backups`, {});
  }

  deleteBackup(tournamentId: string, filename: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tournamentId}/backups/${encodeURIComponent(filename)}`);
  }

  restore(tournamentId: string, filename: string): Observable<ApiResponse<Tournament>> {
    return this.http.post<ApiResponse<Tournament>>(`${this.apiUrl}/${tournamentId}/restore`, { filename });
  }

  uploadBackup(tournamentId: string, file: File): Observable<ApiResponse<Tournament>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<Tournament>>(`${this.apiUrl}/${tournamentId}/backups/upload`, form);
  }

  downloadBackup(tournamentId: string, filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${tournamentId}/backups/${encodeURIComponent(filename)}`, { responseType: 'blob' });
  }

  downloadCsv(tournamentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${tournamentId}/export/current.csv`, { responseType: 'blob' });
  }

  downloadXlsx(tournamentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${tournamentId}/export/xlsx`, { responseType: 'blob' });
  }
}
