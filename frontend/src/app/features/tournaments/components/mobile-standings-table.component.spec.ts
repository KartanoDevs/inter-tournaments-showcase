import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { MobileStandingsTableComponent } from './mobile-standings-table.component';
import { StandingRow } from '../../../shared/models/tournament.model';

function makeRow(o: Partial<StandingRow> = {}): StandingRow {
  return {
    teamId: 'team-1', teamName: 'A', group: 'A',
    played: 2, wins: 1, pf: 30, pc: 20, total: 10, ...o
  };
}

describe('MobileStandingsTableComponent', () => {
  let component: MobileStandingsTableComponent;
  let fixture: ComponentFixture<MobileStandingsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MobileStandingsTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(MobileStandingsTableComponent);
    component = fixture.componentInstance;
  });

  it('rows=[] muestra mensaje vacío', () => {
    component.rows = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin clasificación todavía.');
    expect(fixture.debugElement.query(By.css('table'))).toBeNull();
  });

  it('renderiza una fila por row', () => {
    component.rows = [makeRow({ teamId: 'a' }), makeRow({ teamId: 'b' })];
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('tbody tr')).length).toBe(2);
  });

  it('la primera fila lleva top-row', () => {
    component.rows = [makeRow({ teamId: 'a' }), makeRow({ teamId: 'b' })];
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows[0].nativeElement.classList).toContain('top-row');
    expect(rows[1].nativeElement.classList).not.toContain('top-row');
  });

  it('total positivo => clase positive y prefijo +', () => {
    component.rows = [makeRow({ total: 8 })];
    fixture.detectChanges();
    const totalCell = fixture.debugElement.queryAll(By.css('tbody td')).at(-1)!;
    expect(totalCell.nativeElement.classList).toContain('positive');
    expect(totalCell.nativeElement.textContent.trim()).toBe('+8');
  });

  it('total negativo => clase negative sin prefijo', () => {
    component.rows = [makeRow({ total: -6 })];
    fixture.detectChanges();
    const totalCell = fixture.debugElement.queryAll(By.css('tbody td')).at(-1)!;
    expect(totalCell.nativeElement.classList).toContain('negative');
    expect(totalCell.nativeElement.textContent.trim()).toBe('-6');
  });

  it('renderiza columnas PF/PC (clases col-pf, col-pc) aunque CSS las oculte', () => {
    component.rows = [makeRow({ pf: 45, pc: 33 })];
    fixture.detectChanges();
    const pf = fixture.debugElement.query(By.css('tbody td.col-pf'));
    const pc = fixture.debugElement.query(By.css('tbody td.col-pc'));
    expect(pf.nativeElement.textContent.trim()).toBe('45');
    expect(pc.nativeElement.textContent.trim()).toBe('33');
  });
});
