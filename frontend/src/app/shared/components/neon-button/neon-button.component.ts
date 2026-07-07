import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-neon-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="btn" 
      [type]="type"
      [class.btn-cyan]="variant === 'accept'"
      [class.btn-magenta]="variant === 'reject'"
      [class.btn-secondary]="variant === 'secondary'"
      [class.btn-full]="fullWidth"
      [class.btn-sm]="size === 'sm'"
      [class.btn-xs]="size === 'xs'"
      [class.btn-mega]="size === 'mega'"
      [class.btn-icon-only]="iconOnly"
      [style.font-size]="fontSize || null"
      [disabled]="disabled"
      (click)="onClick.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
  styleUrls: ['./neon-button.component.css']
})
export class NeonButtonComponent {
  @Input() variant: 'accept' | 'reject' | 'secondary' = 'accept';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() fullWidth: boolean = false;
  @Input() size: 'xs' | 'sm' | 'md' | 'mega' = 'md';
  @Input() iconOnly: boolean = false;
  /** Tamaño de letra personalizado (ej: '1.2em', '16px'). Sobreescribe el tamaño del variant. */
  @Input() fontSize: string | null = null;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
