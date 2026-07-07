import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NeonButtonComponent } from '../neon-button/neon-button.component';

@Component({
  selector: 'app-neon-confirm-popup',
  standalone: true,
  imports: [ NeonButtonComponent ],
  templateUrl: './neon-confirm-popup.component.html',
  styleUrl: './neon-confirm-popup.component.css'
})
export class NeonConfirmPopupComponent {
  /** Controla si el popup está visible */
  @Input() visible: boolean = false;

  /** Título del popup */
  @Input() title: string = '¿Confirmar?';

  /** Mensaje descriptivo o pregunta */
  @Input() message: string = '¿Estás seguro de que deseas continuar?';

  /** Texto del botón de confirmación */
  @Input() confirmLabel: string = 'Confirmar';

  /** Texto del botón de cancelación */
  @Input() cancelLabel: string = 'Cancelar';

  /** Variante de color para el botón de confirmar */
  @Input() confirmVariant: 'accept' | 'reject' | 'secondary' = 'reject';

  /** Texto del botón de acción extra opcional (p.ej. "Solo puntos") */
  @Input() extraLabel: string = '';

  /** Variante de color para el botón extra */
  @Input() extraVariant: 'accept' | 'reject' | 'secondary' = 'secondary';

  /** Se emite al pulsar el botón de confirmar */
  @Output() confirm = new EventEmitter<void>();

  /** Se emite al pulsar el botón de cancelar o el fondo */
  @Output() cancel = new EventEmitter<void>();

  /** Se emite al pulsar el botón extra opcional */
  @Output() extra = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent) {
    // Cerrar al hacer click en el fondo oscuro
    if ((event.target as HTMLElement).classList.contains('ncp-overlay')) {
      this.cancel.emit();
    }
  }
}
