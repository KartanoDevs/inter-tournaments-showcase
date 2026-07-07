import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-poke-loader',
  standalone: true,
  imports: [],
  templateUrl: './poke-loader.html',
  styleUrl: './poke-loader.css'
})
export class PokeLoader implements OnInit, OnDestroy {
  @Output() done = new EventEmitter<void>();

  private timer: any;

  ngOnInit() {
    this.timer = setTimeout(() => this.done.emit(), 1800);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
  }
}
