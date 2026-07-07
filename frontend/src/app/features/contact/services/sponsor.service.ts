import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Sponsor } from './sponsor.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SponsorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sponsors`;

  getSponsors(): Observable<Sponsor[]> {
    return this.http.get<{ status: string; data: Sponsor[] }>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }
}
