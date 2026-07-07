import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { DialogHostComponent } from './shared/components/dialog-host/dialog-host';

@Component({
  selector: 'app-root',
  imports: [ RouterOutlet, ToastModule, DialogHostComponent ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
