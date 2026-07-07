import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilePondModule, registerPlugin } from 'ngx-filepond';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

// Asegurarnos de que los plugins están registrados globales para FilePond
registerPlugin(FilePondPluginImagePreview, FilePondPluginFileValidateType);

@Component({
  selector: 'app-neon-file-uploader',
  standalone: true,
  imports: [CommonModule, FilePondModule],
  templateUrl: './neon-file-uploader.html',
  styleUrl: './neon-file-uploader.css'
})
export class NeonFileUploader implements OnChanges
{
  @Input() label: string = 'Arrastra tu archivo aquí o <span class="filepond--label-action"> Examina </span>';
  @Input() options: any = {};
  @Input() marginClass: string = 'mt-2 mb-3';
  /** URL de imagen preexistente (modo edición). FilePond la muestra como preview remoto. */
  @Input() initialImageUrl: string | null = null;

  @Output() fileAdded = new EventEmitter<any>();
  @Output() fileRemoved = new EventEmitter<any>();

  /** Array de ficheros iniciales que FilePond renderiza como preview al abrirse */
  pondFiles: any[] = [];

  ngOnChanges( changes: SimpleChanges ): void
  {
    if ( changes[ 'initialImageUrl' ] )
    {
      const url = this.initialImageUrl;
      this.pondFiles = url ? [ { source: url, options: { type: 'remote' } } ] : [];
    }
  }

  defaultOptions = {
    allowMultiple: false,
    acceptedFileTypes: 'image/jpeg, image/png, image/webp',
    credits: false
  };

  get pondOptions() {
    return {
      ...this.defaultOptions, // defaults
      labelIdle: this.label, // label injected
      ...this.options // options overrides
    };
  }

  onAdd(event: any) {
    this.fileAdded.emit(event);
  }

  onRemove(event: any) {
    this.fileRemoved.emit(event);
  }
}
