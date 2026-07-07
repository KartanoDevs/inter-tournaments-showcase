import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Configuración de un diálogo abierto a través del DialogService.
 * Mantener simple: solo lo que el DialogHostComponent necesita para renderizar.
 */
export interface DialogConfig {
  title: string;
  closeOnBackdrop?: boolean; // Default: true
}

/** Estado interno del servicio */
interface DialogState {
  template: TemplateRef<any>;
  config: DialogConfig;
}

/**
 * Servicio singleton que actúa como bus central de comunicación entre
 * los componentes que invocan modales y el DialogHostComponent
 * que los renderiza a nivel root de la aplicación.
 *
 * Patrón: Signal-based state management sin RxJS para mayor simplicidad.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {

  /** Estado activo del modal. `null` = cerrado. */
  readonly activeDialog = signal<DialogState | null>( null );

  /**
   * Abre un modal global renderizando el TemplateRef en el DialogHostComponent.
   * @param template TemplateRef obtenido en el componente invocador con @ViewChild / template variable
   * @param config Propiedades del modal (título, comportamiento del backdrop)
   */
  open( template: TemplateRef<any>, config: DialogConfig ): void {
    this.activeDialog.set( { template, config } );
  }

  /** Cierra el modal activo y limpia el estado. */
  close(): void {
    this.activeDialog.set( null );
  }
}
