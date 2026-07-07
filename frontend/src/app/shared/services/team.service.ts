import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/team.model';

import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teams`;

  getAllTeams(): Observable<ApiResponse<Team[]>> {
    return this.http.get<ApiResponse<Team[]>>(this.apiUrl);
  }

  getTeamById(id: string): Observable<ApiResponse<Team>> {
    return this.http.get<ApiResponse<Team>>(`${this.apiUrl}/${id}`);
  }

  createTeam(formData: FormData): Observable<ApiResponse<Team>> {
    return this.http.post<ApiResponse<Team>>(this.apiUrl, formData);
  }

  updateTeam(id: string, formData: FormData): Observable<ApiResponse<Team>> {
    return this.http.patch<ApiResponse<Team>>( `${ this.apiUrl }/${ id }`, formData );
  }

  deleteTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
