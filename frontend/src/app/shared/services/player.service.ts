import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player.model';
import { ApiResponse } from './team.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/players`;

  getPlayers(teamId?: string): Observable<ApiResponse<Player[]>> {
    let params = new HttpParams();
    if (teamId) {
      params = params.set('teamId', teamId);
    }
    return this.http.get<ApiResponse<Player[]>>(this.apiUrl, { params });
  }

  getPlayerById(id: string): Observable<ApiResponse<Player>> {
    return this.http.get<ApiResponse<Player>>(`${this.apiUrl}/${id}`);
  }

  createPlayer(formData: FormData): Observable<ApiResponse<Player>> {
    return this.http.post<ApiResponse<Player>>(this.apiUrl, formData);
  }

  updatePlayer(id: string, formData: FormData): Observable<ApiResponse<Player>> {
    return this.http.patch<ApiResponse<Player>>( `${ this.apiUrl }/${ id }`, formData );
  }

  deletePlayer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
