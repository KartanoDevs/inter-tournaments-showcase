import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-neon-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './neon-dialog.html',
  styleUrl: './neon-dialog.css'
})
export class NeonDialog {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  
  @Input() header: string = '';
  @Input() width: string = '100%';
  @Input() modal: boolean = true;
  @Input() maximizable: boolean = false;
  @Input() hasFooter: boolean = true;
  @Input() blurBackdrop: boolean = true;
}
