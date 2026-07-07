import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe de transformación de rutas de media del backend.
 *
 * El dev-server de Angular proxifica /public hacia el backend (puerto 3000)
 * a través de proxy.conf.json. En producción, el servidor estático (Nginx/Express)
 * sirve la misma ruta relativa.
 *
 * Por eso basta con devolver la ruta tal cual; NO construir URLs absolutas
 * con el host del backend, para que funcione igual en dev y prod.
 *
 * Uso en template:
 *   <img [src]="player.thumbnailUrl | mediaUrl" />
 *   <img [src]="team.logo | mediaUrl" />
 *
 * Si la ruta es null/undefined/vacía devuelve '' para evitar peticiones vacías.
 */
@Pipe({
  name: 'mediaUrl',
  standalone: true,
  pure: true,
})
export class MediaUrlPipe implements PipeTransform {
  transform( path: string | null | undefined ): string {
    if ( !path ) return '';
    return path;
  }
}
