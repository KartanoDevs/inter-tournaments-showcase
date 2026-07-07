import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../services/dialog.service';

/**
 * Host singleton que vive en app.html (fuera de cualquier layout o scroll container).
 * Renderiza el modal activo que el DialogService haya registrado.
 *
 * Al estar en la raíz del árbol de componentes, `position: fixed` e `inset: 0`
 * siempre serán relativos al viewport real, independientemente del contexto CSS
 * del componente que haya invocado el modal.
 */
@Component({
  selector: 'app-dialog-host',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './dialog-host.html',
  styleUrl: './dialog-host.css',
})
export class DialogHostComponent {
  readonly dialogService = inject( DialogService );

  onBackdropClick(): void {
    const state = this.dialogService.activeDialog();
    if ( state?.config.closeOnBackdrop !== false ) {
      this.dialogService.close();
    }
  }
}
