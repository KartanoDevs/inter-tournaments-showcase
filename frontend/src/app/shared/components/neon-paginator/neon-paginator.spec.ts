import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NeonPaginatorComponent } from './neon-paginator';

describe('NeonPaginatorComponent', () => {
  let component: NeonPaginatorComponent;
  let fixture: ComponentFixture<NeonPaginatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeonPaginatorComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(NeonPaginatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
  });

  // ── Inputs por defecto ────────────────────────────────────────────────────

  describe('inputs por defecto', () => {
    it('totalRecords = 0', () => expect(component.totalRecords).toBe(0));
    it('rows = 10', () => expect(component.rows).toBe(10));
    it('first = 0', () => expect(component.first).toBe(0));
    it('rowsPerPageOptions = [10, 25, 50]', () => {
      expect(component.rowsPerPageOptions).toEqual([10, 25, 50]);
    });
  });

  // ── onPageChange ──────────────────────────────────────────────────────────

  describe('onPageChange', () => {
    it('emite { first, rows } del evento', () => {
      const spy = vi.fn();
      component.pageChange.subscribe(spy);

      component.onPageChange({ first: 20, rows: 25, page: 1, pageCount: 4 });

      expect(spy).toHaveBeenCalledWith({ first: 20, rows: 25 });
    });

    it('usa 0 como fallback cuando event.first es undefined', () => {
      const spy = vi.fn();
      component.pageChange.subscribe(spy);

      component.onPageChange({ first: undefined, rows: 10 } as any);

      expect(spy).toHaveBeenCalledWith({ first: 0, rows: 10 });
    });

    it('usa this.rows como fallback cuando event.rows es undefined', () => {
      const spy = vi.fn();
      component.rows = 15;
      component.pageChange.subscribe(spy);

      component.onPageChange({ first: 30, rows: undefined } as any);

      expect(spy).toHaveBeenCalledWith({ first: 30, rows: 15 });
    });

    it('emite cuando first=0 (primera página)', () => {
      const spy = vi.fn();
      component.pageChange.subscribe(spy);

      component.onPageChange({ first: 0, rows: 10, page: 0, pageCount: 2 });

      expect(spy).toHaveBeenCalledWith({ first: 0, rows: 10 });
    });
  });

  // ── Binding de inputs ─────────────────────────────────────────────────────

  describe('binding de inputs', () => {
    it('acepta totalRecords personalizado', () => {
      component.totalRecords = 100;
      fixture.detectChanges();
      expect(component.totalRecords).toBe(100);
    });

    it('acepta rows personalizado', () => {
      component.rows = 25;
      fixture.detectChanges();
      expect(component.rows).toBe(25);
    });

    it('acepta first personalizado', () => {
      component.first = 50;
      fixture.detectChanges();
      expect(component.first).toBe(50);
    });

    it('acepta rowsPerPageOptions personalizado', () => {
      component.rowsPerPageOptions = [5, 10, 20];
      fixture.detectChanges();
      expect(component.rowsPerPageOptions).toEqual([5, 10, 20]);
    });
  });
});
