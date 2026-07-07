import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DynamicFieldConfig } from './dynamic-form.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { NeonFileUploader } from '../neon-file-uploader/neon-file-uploader';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    InputTextModule, 
    InputNumberModule,
    ToggleSwitchModule,
    SelectModule, 
    ButtonModule,
    NeonFileUploader
  ],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.css'
})
export class DynamicFormComponent implements OnInit, OnChanges, OnDestroy
{
  @Input() fields: DynamicFieldConfig[] = [];
  @Input() initialData: any = {};
  @Input() submitLabel = 'GUARDAR';
  
  @Output() formSubmit = new EventEmitter<{ values: any, files: Record<string, File> }>();
  @Output() isDirtyChange = new EventEmitter<boolean>();

  form!: FormGroup;
  files: Record<string, File> = {};
  private destroy$ = new Subject<void>();
  /** Handle del timer pendiente para evitar doble ejecución de buildForm */
  private buildTimer: any = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    const fieldsChanged = !!changes[ 'fields' ];
    const dataChanged = !!changes[ 'initialData' ];

    // En la creación inicial del componente, ngOnChanges se dispara ANTES de ngOnInit.
    // ngOnInit ya llama buildForm() con los datos correctos, así que aquí no hacemos nada
    // para evitar que el setTimeout posterior machaque el FormGroup recién creado,
    // lo que causaba que PrimeNG no pudiera re-sincronizar el p-select.
    if ( fieldsChanged && changes[ 'fields' ].isFirstChange() ) return;

    // Cambio de estructura del formulario: rebuild completo
    if ( fieldsChanged )
    {
      clearTimeout( this.buildTimer );
      this.buildTimer = setTimeout( () => this.buildForm(), 0 );
      return;
    }

    // Solo cambian los datos (misma estructura, nueva entidad a editar):
    // patchValue es más fiable que recrear el FormGroup entero
    if ( dataChanged && this.form )
    {
      clearTimeout( this.buildTimer );
      this.buildTimer = setTimeout( () => this.patchFormValues(), 0 );
    }
  }

  ngOnDestroy(): void
  {
    clearTimeout( this.buildTimer );
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm() {
    this.destroy$.next(); // Cancela subscripciones anteriores del form viejo

    const group: any = {};
    
    this.fields.forEach(field => {
      let initialValue = this.resolveInitialValue( field );
      group[field.name] = [initialValue, field.validators || []];
    });

    this.form = this.fb.group(group);
    this.files = {}; // Resetea ficheros al reconstruir el form

    // Escucha cambios para notificar al padre del estado dirty
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.isDirtyChange.emit(this.form.dirty || Object.keys(this.files).length > 0);
    });
  }

  /** Aplica los datos de initialData sobre un FormGroup ya existente */
  private patchFormValues(): void
  {
    if ( !this.form ) return;

    const patch: any = {};
    this.fields.forEach( field =>
    {
      if ( field.type !== 'file' )
      {
        patch[ field.name ] = this.resolveInitialValue( field );
      }
    } );
    this.form.patchValue( patch, { emitEvent: false } );
    this.form.markAsPristine();
  }

  /** Resuelve el valor inicial de un campo respetando su tipo */
  private resolveInitialValue( field: DynamicFieldConfig ): any
  {
    if ( field.type === 'file' ) return null; // Los archivos van por evento separado
    if ( field.type === 'number' )
    {
      const val = this.initialData?.[ field.name ];
      return ( val === '' || val === undefined ) ? null : val;
    }
    return this.initialData?.[ field.name ] ?? null;
  }

  onFileAdded(event: any, fieldName: string) {
    this.files[fieldName] = event.file.file;
    this.form.markAsDirty();
    this.isDirtyChange.emit(true);
  }

  onFileRemoved(fieldName: string) {
    delete this.files[fieldName];
    this.form.markAsDirty();
    this.isDirtyChange.emit(true);
  }

  onSubmit() {
    this.form.markAllAsTouched();
    
    if (this.form.valid) {
      this.formSubmit.emit({
        values: this.form.value,
        files: this.files
      } );
    }
  }
}
