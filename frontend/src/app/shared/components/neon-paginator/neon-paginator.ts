import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-neon-paginator',
  standalone: true,
  imports: [PaginatorModule],
  templateUrl: './neon-paginator.html',
  styleUrl: './neon-paginator.css',
  encapsulation: ViewEncapsulation.None
})
export class NeonPaginatorComponent {
  @Input() totalRecords = 0;
  @Input() rows = 10;
  @Input() first = 0;
  @Input() rowsPerPageOptions: number[] = [10, 25, 50];
  @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

  onPageChange(event: PaginatorState) {
    this.pageChange.emit({ first: event.first ?? 0, rows: event.rows ?? this.rows });
  }
}
