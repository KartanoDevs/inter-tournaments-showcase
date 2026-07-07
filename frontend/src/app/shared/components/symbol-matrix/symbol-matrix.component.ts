import { Component, ChangeDetectionStrategy, input, computed, signal, HostListener, OnInit, ElementRef, inject } from '@angular/core';

/**
 * Componente decorativo de fondo que genera una cuadrícula de símbolos/kanjis/letras
 * animados en estilo "matrix". Acepta cualquier array de strings como caracteres.
 *
 * Uso básico:
 *   <app-symbol-matrix [symbols]="['排', '球', '部', '練']" />
 *
 * Uso avanzado con count personalizado:
 *   <app-symbol-matrix [symbols]="mySymbols" [count]="500" />
 */
@Component({
  selector: 'app-symbol-matrix',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    'class': 'symbol-matrix',
  },
  template: `
    @for (symbol of repeatedSymbols(); track $index) {
      <span>{{ symbol }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      /* Opción C: el tamaño de celda se controla desde TS vía CSS custom property */
      grid-template-columns: repeat(auto-fill, minmax(var(--cell-size, 40px), 1fr));
      grid-auto-rows: var(--cell-size, 40px);
      font-size: clamp(14px, 2.5vw, 28px);
      font-family: "Courier New", Courier, monospace;
      justify-content: center;
      align-content: start;
      user-select: none;
      pointer-events: none;
      contain: strict;
    }

    /* Opción B: los spans son estáticos en color. Solo animamos opacity (cero repintado). */
    :host > span {
      text-align: center;
      line-height: 1;
      user-select: none;
      /* Color base estático: no provoca repintado */
      color: rgba(0, 229, 255, 0.2);
    }

    /* Subconjunto activo con colores base más vivos — definidos estáticamente */
    :host > span:nth-child(11n)       { color: rgba(0, 229, 255, 0.55); }
    :host > span:nth-child(19n + 2)   { color: rgba(255, 0, 255, 0.45); }
    :host > span:nth-child(29n + 1)   { color: rgba(0, 229, 255, 0.65); }
    :host > span:nth-child(37n + 10)  { color: rgba(255, 255, 255, 0.5); }
    :host > span:nth-child(41n + 1)   { color: rgba(0, 229, 255, 0.40); }
    :host > span:nth-child(17n + 9)   { color: rgba(255, 0, 255, 0.55); }
    :host > span:nth-child(23n + 18)  { color: rgba(255, 255, 255, 0.35); }
    :host > span:nth-child(31n + 4)   { color: rgba(0, 229, 255, 0.70); }
    :host > span:nth-child(43n + 20)  { color: rgba(255, 0, 255, 0.60); }
    :host > span:nth-child(13n + 6)   { color: rgba(255, 255, 255, 0.45); }

    /* Opción B: animación SOLO de opacity — el compositor la resuelve sin Paint ni Layout */
    :host > span:nth-child(11n)       { animation: sym-fade 2.9s ease-in-out infinite 1.1s; }
    :host > span:nth-child(19n + 2)   { animation: sym-fade 3.5s ease-in-out infinite 0.2s; }
    :host > span:nth-child(29n + 1)   { animation: sym-fade 4.1s ease-in-out infinite 0.7s; }
    :host > span:nth-child(37n + 10)  { animation: sym-fade 5.3s ease-in-out infinite 1.5s; }
    :host > span:nth-child(41n + 1)   { animation: sym-fade 3.9s ease-in-out infinite 0.4s; }
    :host > span:nth-child(17n + 9)   { animation: sym-fade 2.8s ease-in-out infinite 0.9s; }
    :host > span:nth-child(23n + 18)  { animation: sym-fade 4.3s ease-in-out infinite 1.3s; }
    :host > span:nth-child(31n + 4)   { animation: sym-fade 5.6s ease-in-out infinite 0.1s; }
    :host > span:nth-child(43n + 20)  { animation: sym-fade 3.6s ease-in-out infinite 1.8s; }
    :host > span:nth-child(13n + 6)   { animation: sym-fade 3.2s ease-in-out infinite 1.2s; }

    @keyframes sym-fade {
      0%, 100% { opacity: 0.3; }
      50%      { opacity: 1;   }
    }
  `,
})
export class SymbolMatrixComponent implements OnInit {
  private readonly el = inject(ElementRef);
  /** Array de símbolos/kanjis/letras que se mostrarán en la cuadrícula. */
  symbols = input.required<string[]>();

  /** Número explícito opcional. Si no se provee, se calcula dinámicamente. */
  count = input<number>();

  /** Cantidad calculada internamente basada en el tamaño del viewport */
  private dynamicCount = signal(400);

  /** Array resultante de símbolos repetidos cíclicamente hasta alcanzar `count()` o el cálculo dinámico. */
  repeatedSymbols = computed<string[]>(() => {
    const src = this.symbols();
    const total = this.count() ?? this.dynamicCount();

    // Protección: si no hay símbolos, devolvemos array vacío para evitar división por 0
    if (!src.length) return [];

    return Array.from({ length: total }, (_, i) => src[i % src.length]);
  });

  ngOnInit() {
    this.calculateCount();
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateCount();
  }

  private calculateCount() {
    if (typeof window !== 'undefined') {
      // Opción C: en móvil usamos celdas de 80px para generar ~4x menos nodos
      const isMobile = window.innerWidth < 768;
      const cellSize = isMobile ? 80 : 40;

      // Sincronizamos el tamaño de celda con el CSS Grid vía custom property
      (this.el.nativeElement as HTMLElement).style.setProperty('--cell-size', `${cellSize}px`);

      const cols = Math.ceil(window.innerWidth / cellSize);
      const rows = Math.ceil(window.innerHeight / cellSize);
      this.dynamicCount.set(cols * rows);
    }
  }
}
