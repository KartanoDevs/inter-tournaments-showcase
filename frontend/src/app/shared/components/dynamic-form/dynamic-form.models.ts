import { ValidatorFn } from '@angular/forms';

export interface DynamicFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'toggle' | 'file';
  options?: { label: string; value: any }[]; // Para campos select
  fileConfig?: { previewHeight?: number; accept?: string }; // Para campos file
  // URL de la imagen actual (modo edición): FilePond la precarga como preview
  initialImageUrl?: string;
  validators?: ValidatorFn[];
  required?: boolean;
  placeholder?: string;
}
