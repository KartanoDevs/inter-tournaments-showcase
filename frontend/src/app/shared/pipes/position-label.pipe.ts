import { Pipe, PipeTransform } from '@angular/core';
import { VolleyballPosition } from '../models/player.model';

type GenderLabel = Record<VolleyballPosition, string>;

const POSITION_MALE: GenderLabel = {
  [VolleyballPosition.SETTER]:         'Colocador',
  [VolleyballPosition.OUTSIDE_HITTER]: 'Receptor',
  [VolleyballPosition.OPPOSITE]:       'Opuesto',
  [VolleyballPosition.MIDDLE_BLOCKER]: 'Central',
  [VolleyballPosition.LIBERO]:         'Líbero',
  [VolleyballPosition.UNIVERSAL]:      'Universal',
  [VolleyballPosition.COACH]:          'Entrenador',
  [VolleyballPosition.UNASSIGNED]:     'Sin asignar',
};

export const POSITION_LABELS_MALE = POSITION_MALE;

const POSITION_FEMALE: GenderLabel = {
  [VolleyballPosition.SETTER]:         'Colocadora',
  [VolleyballPosition.OUTSIDE_HITTER]: 'Receptora',
  [VolleyballPosition.OPPOSITE]:       'Opuesta',
  [VolleyballPosition.MIDDLE_BLOCKER]: 'Central',
  [VolleyballPosition.LIBERO]:         'Líbera',
  [VolleyballPosition.UNIVERSAL]:      'Universal',
  [VolleyballPosition.COACH]:          'Entrenadora',
  [VolleyballPosition.UNASSIGNED]:     'Sin asignar',
};

@Pipe({
  name: 'positionLabel',
  standalone: true,
  pure: true
})
export class PositionLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, gender: 'MALE' | 'FEMALE' = 'MALE'): string {
    if (!value) return '-';
    const map = gender === 'FEMALE' ? POSITION_FEMALE : POSITION_MALE;
    return map[value as VolleyballPosition] ?? value;
  }
}
