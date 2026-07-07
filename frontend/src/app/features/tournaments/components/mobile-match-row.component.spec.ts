import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { MobileMatchRowComponent } from './mobile-match-row.component';
import { TournamentMatch, Tournament4v4Team } from '../../../shared/models/tournament.model';

function makeTeam(o: Partial<Tournament4v4Team> = {}): Tournament4v4Team {
  return {
    id: 'team-1', name: 'A', group: 'A', drawOrder: 0,
    tournamentId: 'trn-1', createdAt: '2026-01-01T00:00:00.000Z', ...o
  };
}

function makeMatch(o: Partial<TournamentMatch> = {}): TournamentMatch {
  return {
    id: 'm-1', tournamentId: 'trn-1', phase: 'GROUP', group: 'A',
    homeTeamId: 'team-1', awayTeamId: 'team-2',
    homeTeam: makeTeam({ id: 'team-1', name: 'Local' }),
    awayTeam: makeTeam({ id: 'team-2', name: 'Visita' }),
    homeScore: null, awayScore: null, played: false,
    updatedAt: '2026-01-01T00:00:00.000Z', ...o
  };
}

describe('MobileMatchRowComponent', () => {
  let component: MobileMatchRowComponent;
  let fixture: ComponentFixture<MobileMatchRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MobileMatchRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(MobileMatchRowComponent);
    component = fixture.componentInstance;
  });

  it('renderiza nombres de los equipos', () => {
    component.match = makeMatch();
    fixture.detectChanges();
    const txt = fixture.nativeElement.textContent;
    expect(txt).toContain('Local');
    expect(txt).toContain('Visita');
  });

  it('renderiza scores numéricos', () => {
    component.match = makeMatch({ homeScore: 21, awayScore: 15 });
    fixture.detectChanges();
    const scores = fixture.debugElement.queryAll(By.css('.score-readonly'));
    expect(scores[0].nativeElement.textContent.trim()).toBe('21');
    expect(scores[1].nativeElement.textContent.trim()).toBe('15');
  });

  it('null score muestra "—" con clase score-empty', () => {
    component.match = makeMatch({ homeScore: null, awayScore: null });
    fixture.detectChanges();
    const scores = fixture.debugElement.queryAll(By.css('.score-readonly'));
    expect(scores[0].nativeElement.textContent.trim()).toBe('—');
    expect(scores[0].nativeElement.classList).toContain('score-empty');
    expect(scores[1].nativeElement.classList).toContain('score-empty');
  });

  it('played=true aplica clase match-row-played', () => {
    component.match = makeMatch({ played: true });
    fixture.detectChanges();
    const row = fixture.debugElement.query(By.css('.match-row'));
    expect(row.nativeElement.classList).toContain('match-row-played');
  });

  it('played=false NO aplica clase match-row-played', () => {
    component.match = makeMatch({ played: false });
    fixture.detectChanges();
    const row = fixture.debugElement.query(By.css('.match-row'));
    expect(row.nativeElement.classList).not.toContain('match-row-played');
  });
});
