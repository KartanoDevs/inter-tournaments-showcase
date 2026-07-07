import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { StandingsTableComponent } from './standings-table.component';
import { StandingRow } from '../../../shared/models/tournament.model';

function makeRow(overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    teamId: 'team-1',
    teamName: 'Equipo A',
    group: 'A',
    played: 2,
    wins: 1,
    pf: 30,
    pc: 25,
    total: 5,
    ...overrides
  };
}

describe('StandingsTableComponent', () => {
  let component: StandingsTableComponent;
  let fixture: ComponentFixture<StandingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StandingsTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(StandingsTableComponent);
    component = fixture.componentInstance;
  });

  it('cuando rows=[] muestra el mensaje vacío', () => {
    component.rows = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin clasificación todavía.');
    expect(fixture.debugElement.query(By.css('table'))).toBeNull();
  });

  it('renderiza una fila por cada row', () => {
    component.rows = [makeRow({ teamId: 'a' }), makeRow({ teamId: 'b' }), makeRow({ teamId: 'c' })];
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(3);
  });

  it('la primera fila lleva clase top-row', () => {
    component.rows = [makeRow({ teamId: 'a' }), makeRow({ teamId: 'b' })];
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows[0].nativeElement.classList).toContain('top-row');
    expect(rows[1].nativeElement.classList).not.toContain('top-row');
  });

  it('total positivo aplica clase positive y prefijo +', () => {
    component.rows = [makeRow({ total: 12 })];
    fixture.detectChanges();
    const totalCell = fixture.debugElement.queryAll(By.css('tbody td')).at(-1)!;
    expect(totalCell.nativeElement.classList).toContain('positive');
    expect(totalCell.nativeElement.textContent.trim()).toBe('+12');
  });

  it('total negativo aplica clase negative sin prefijo', () => {
    component.rows = [makeRow({ total: -8 })];
    fixture.detectChanges();
    const totalCell = fixture.debugElement.queryAll(By.css('tbody td')).at(-1)!;
    expect(totalCell.nativeElement.classList).toContain('negative');
    expect(totalCell.nativeElement.textContent.trim()).toBe('-8');
  });

  it('renderiza los valores numéricos en orden esperado', () => {
    component.rows = [makeRow({ teamName: 'AAA', played: 3, wins: 2, pf: 50, pc: 40, total: 10 })];
    fixture.detectChanges();
    const cells = fixture.debugElement.queryAll(By.css('tbody td'));
    // Orden: posición, nombre, PJ, V, PF, PC, Dif
    expect(cells[0].nativeElement.textContent.trim()).toBe('1');
    expect(cells[1].nativeElement.textContent.trim()).toBe('AAA');
    expect(cells[2].nativeElement.textContent.trim()).toBe('3');
    expect(cells[3].nativeElement.textContent.trim()).toBe('2');
    expect(cells[4].nativeElement.textContent.trim()).toBe('50');
    expect(cells[5].nativeElement.textContent.trim()).toBe('40');
    expect(cells[6].nativeElement.textContent.trim()).toBe('+10');
  });
});
