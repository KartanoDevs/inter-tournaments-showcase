import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { MatchRowComponent } from './match-row.component';
import { TournamentMatch, Tournament4v4Team } from '../../../shared/models/tournament.model';

function makeTeam(overrides: Partial<Tournament4v4Team> = {}): Tournament4v4Team {
  return {
    id: 'team-1',
    name: 'Local',
    group: 'A',
    drawOrder: 0,
    tournamentId: 'trn-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

function makeMatch(overrides: Partial<TournamentMatch> = {}): TournamentMatch {
  const home = makeTeam({ id: 'team-1', name: 'Local' });
  const away = makeTeam({ id: 'team-2', name: 'Visita' });
  return {
    id: 'm-1',
    tournamentId: 'trn-1',
    phase: 'GROUP',
    group: 'A',
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeTeam: home,
    awayTeam: away,
    homeScore: null,
    awayScore: null,
    played: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('MatchRowComponent', () => {
  let component: MatchRowComponent;
  let fixture: ComponentFixture<MatchRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MatchRowComponent] }).compileComponents();
    fixture = TestBed.createComponent(MatchRowComponent);
    component = fixture.componentInstance;
  });

  it('renderiza nombres home y away', () => {
    component.match = makeMatch();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Local');
    expect(text).toContain('Visita');
  });

  describe('readOnly', () => {
    beforeEach(() => {
      component.readOnly = true;
    });

    it('muestra spans de score y no inputs', () => {
      component.match = makeMatch({ homeScore: 21, awayScore: 19, played: true });
      fixture.detectChanges();
      const inputs = fixture.debugElement.queryAll(By.css('input'));
      const readonly = fixture.debugElement.queryAll(By.css('.score-readonly'));
      expect(inputs.length).toBe(0);
      expect(readonly.length).toBe(2);
      expect(readonly[0].nativeElement.textContent.trim()).toBe('21');
      expect(readonly[1].nativeElement.textContent.trim()).toBe('19');
    });

    it('muestra "—" y clase score-empty cuando score es null', () => {
      component.match = makeMatch({ homeScore: null, awayScore: null });
      fixture.detectChanges();
      const readonly = fixture.debugElement.queryAll(By.css('.score-readonly'));
      expect(readonly[0].nativeElement.textContent.trim()).toBe('—');
      expect(readonly[0].nativeElement.classList).toContain('score-empty');
    });
  });

  describe('modo editable', () => {
    it('muestra inputs con los valores de match', () => {
      component.match = makeMatch({ homeScore: 21, awayScore: 18 });
      component.readOnly = false;
      fixture.detectChanges();
      const inputs = fixture.debugElement.queryAll(By.css('input'));
      expect(inputs.length).toBe(2);
      expect(inputs[0].nativeElement.value).toBe('21');
      expect(inputs[1].nativeElement.value).toBe('18');
    });

    it('cuando dirty usa editingHome/editingAway en vez del match', () => {
      component.match = makeMatch({ homeScore: 21, awayScore: 18 });
      component.dirty = true;
      component.editingHome = 10;
      component.editingAway = 7;
      fixture.detectChanges();
      expect(component.homeValue).toBe(10);
      expect(component.awayValue).toBe(7);
    });

    it('cuando dirty aplica clase match-row-dirty', () => {
      component.match = makeMatch();
      component.dirty = true;
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('.match-row'));
      expect(row.nativeElement.classList).toContain('match-row-dirty');
    });

    it('cuando played && !dirty aplica clase match-row-played', () => {
      component.match = makeMatch({ played: true });
      component.dirty = false;
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('.match-row'));
      expect(row.nativeElement.classList).toContain('match-row-played');
    });

    it('played + dirty NO aplica clase match-row-played', () => {
      component.match = makeMatch({ played: true });
      component.dirty = true;
      fixture.detectChanges();
      const row = fixture.debugElement.query(By.css('.match-row'));
      expect(row.nativeElement.classList).not.toContain('match-row-played');
    });
  });

  describe('outputs', () => {
    it('onHome emite el string recibido', () => {
      component.match = makeMatch();
      let emitted: string | null = null;
      component.homeChange.subscribe(v => (emitted = v));
      component.onHome('15');
      expect(emitted).toBe('15');
    });

    it('onAway emite el string recibido', () => {
      component.match = makeMatch();
      let emitted: string | null = null;
      component.awayChange.subscribe(v => (emitted = v));
      component.onAway('17');
      expect(emitted).toBe('17');
    });
  });
});
