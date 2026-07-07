import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-unsaved-changes-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './unsaved-changes-dialog.html',
  styleUrl: './unsaved-changes-dialog.css'
})
export class UnsavedChangesDialogComponent {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  
  // Emite true si el usuario decide salir (descartar), false si cancela la salida
  @Output() confirm = new EventEmitter<boolean>();

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.confirm.emit(false);
  }

  onConfirm() {
    this.visible = false;
    this.visibleChange.emit(this.visible);
    this.confirm.emit(true);
  }
}
