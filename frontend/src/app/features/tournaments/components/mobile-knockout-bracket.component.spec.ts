import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { MobileKnockoutBracketComponent } from './mobile-knockout-bracket.component';
import { TournamentMatch, TournamentPhase, Tournament4v4Team } from '../../../shared/models/tournament.model';

function makeTeam(o: Partial<Tournament4v4Team> = {}): Tournament4v4Team {
  return {
    id: 'team-1', name: 'A', group: 'A', drawOrder: 0,
    tournamentId: 'trn-1', createdAt: '2026-01-01T00:00:00.000Z', ...o
  };
}

function makeMatch(phase: TournamentPhase, id: string): TournamentMatch {
  return {
    id, tournamentId: 'trn-1', phase, group: null,
    homeTeamId: 'team-1', awayTeamId: 'team-2',
    homeTeam: makeTeam({ id: 'team-1', name: 'A' }),
    awayTeam: makeTeam({ id: 'team-2', name: 'B' }),
    homeScore: null, awayScore: null, played: false,
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

describe('MobileKnockoutBracketComponent', () => {
  let component: MobileKnockoutBracketComponent;
  let fixture: ComponentFixture<MobileKnockoutBracketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MobileKnockoutBracketComponent] }).compileComponents();
    fixture = TestBed.createComponent(MobileKnockoutBracketComponent);
    component = fixture.componentInstance;
  });

  it('byPhase filtra por fase', () => {
    const matches = [makeMatch('QF', 'q1'), makeMatch('SF', 's1'), makeMatch('QF', 'q2')];
    component.matches = matches;
    expect(component.byPhase('QF').map(m => m.id)).toEqual(['q1', 'q2']);
    expect(component.byPhase('SF').map(m => m.id)).toEqual(['s1']);
    expect(component.byPhase('FINAL')).toEqual([]);
  });

  it('matches=[] solo renderiza el título principal', () => {
    component.matches = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fase eliminatoria');
    expect(fixture.debugElement.queryAll(By.css('.phase-block')).length).toBe(0);
  });

  it('solo renderiza bloques de fase con partidos', () => {
    component.matches = [makeMatch('QF', 'q1'), makeMatch('FINAL', 'f1')];
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.phase-title'));
    const texts = titles.map(t => t.nativeElement.textContent.trim());
    expect(texts).toContain('Cuartos de final');
    expect(texts).toContain('Final');
    expect(texts).not.toContain('Semifinales');
    expect(texts).not.toContain('3º y 4º puesto');
  });

  it('el bloque FINAL recibe la clase final-title', () => {
    component.matches = [makeMatch('FINAL', 'f1')];
    fixture.detectChanges();
    const finalTitle = fixture.debugElement.query(By.css('.phase-title.final-title'));
    expect(finalTitle).toBeTruthy();
    expect(finalTitle.nativeElement.textContent.trim()).toBe('Final');
  });

  it('renderiza un app-tournaments-match-row por partido', () => {
    component.matches = [makeMatch('QF', 'q1'), makeMatch('QF', 'q2'), makeMatch('SF', 's1')];
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('app-tournaments-match-row'));
    expect(rows.length).toBe(3);
  });

  it('renderiza bloque "3º y 4º puesto" cuando hay match THIRD', () => {
    component.matches = [makeMatch('THIRD', 't1')];
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.phase-title')).map(e => e.nativeElement.textContent.trim());
    expect(titles).toContain('3º y 4º puesto');
  });

  it('renderiza bloque Semifinales cuando hay SF', () => {
    component.matches = [makeMatch('SF', 's1'), makeMatch('SF', 's2')];
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.phase-title')).map(e => e.nativeElement.textContent.trim());
    expect(titles).toContain('Semifinales');
  });

  it('orden bracket: QF → SF → THIRD → FINAL', () => {
    component.matches = [
      makeMatch('FINAL', 'f'),
      makeMatch('THIRD', 't'),
      makeMatch('SF', 's'),
      makeMatch('QF', 'q')
    ];
    fixture.detectChanges();
    const titles = fixture.debugElement.queryAll(By.css('.phase-title')).map(e => e.nativeElement.textContent.trim());
    expect(titles).toEqual(['Final', '3º y 4º puesto', 'Semifinales', 'Cuartos de final']);
  });
});
