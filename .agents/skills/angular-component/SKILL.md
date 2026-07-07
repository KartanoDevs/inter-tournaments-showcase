---
name: angular-component
description: Create modern Angular standalone components following v20+ best practices. Use for building UI components with signal-based inputs/outputs, OnPush change detection, host bindings, content projection, and lifecycle hooks. Triggers on component creation, refactoring class-based inputs to signals, adding host bindings, or implementing accessible interactive components.
---

# Angular Component

Create standalone components for Angular v20+. Components are standalone by default—do NOT set `standalone: true`.

## Independence and Reusability

**Los componentes DEBEN ser independientes.** Su diseño funcional y visual no puede depender del lugar donde se invoquen (rutas, ventanas o padres específicos).

**Red Flags - STOP and Refactor:**
- El componente asume que el contenedor padre le dará tamaño, padding o un contexto grid/flexbox.
- El componente extrae parámetros de la ruta (URL) directamente en lugar de recibirlos por `input()`.
- Dependencia directa de estilos CSS heredados de una página específica (`.contact-page .mi-componente`).
- Peticiones HTTP acopladas a la vista en lugar de delegadas a servicios.

**No exceptions:**
- El `:host` debe definir su propio `display` y `box-sizing`.
- Toda la data entra por `input()`.
- Todo evento sale por `output()`.
- Violar la independencia del componente es violar la arquitectura.

## Component Structure

```typescript
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'user-card',
    '[class.active]': 'isActive()',
    '(click)': 'handleClick()',
  },
  template: `
    <img [src]="avatarUrl()" [alt]="name() + ' avatar'" />
    <h2>{{ name() }}</h2>
    @if (showEmail()) {
      <p>{{ email() }}</p>
    }
  `,
  styles: `
    :host { display: block; }
    :host.active { border: 2px solid blue; }
  `,
})
export class UserCard {
  // Required input
  name = input.required<string>();
  
  // Optional input with default
  email = input<string>('');
  showEmail = input(false);
  
  // Input with transform
  isActive = input(false, { transform: booleanAttribute });
  
  // Computed from inputs
  avatarUrl = computed(() => `https://api.example.com/avatar/${this.name()}`);
  
  // Output
  selected = output<string>();
  
  handleClick() {
    this.selected.emit(this.name());
  }
}
```

## PrimeNG Best Practices

**Botones e Iconos (`p-button` / `ButtonModule`):**
Nunca utilices la propiedad de entrada `icon="..."` o inyectes manualmente clases legacy como `p-button-icon-left`. En las nuevas versiones de PrimeNG (v21+), la propiedad `icon` renderiza un span interno que obliga visualmente a esas clases legacy, las cuales colapsan nuestra paleta CSS y ocultan los iconos.

✅ **FORMA CORRECTA (Transclusión de contenido):**
Maneja el DOM interno manualmente inyectando tu propio `<i>` dentro del cuerpo `<p-button>`. Usa márgenes estándar locales de Tailwind (ej. `mr-2` si le sigue un texto).
```html
<p-button styleClass="p-button-success">
  <i class="pi pi-check mr-2"></i><span>Guardar</span>
</p-button>

<!-- Botón sin etiqueta (solo con icono) -->
<p-button styleClass="p-button-rounded p-button-info">
  <i class="pi pi-pencil"></i>
</p-button>
```

❌ **FORMA INCORRECTA (Genera `p-button-icon-left` implícito o explícito):**
```html
<!-- PROHIBIDO: Usar la prop icon (Genera conflicto CSS) -->
<p-button label="Guardar" icon="pi pi-check" styleClass="p-button-success"></p-button>

<!-- PROHIBIDO: inyectar la clase p-button-icon de forma manual -->
<p-button label="Guardar" styleClass="p-button-success">
  <i class="pi pi-check p-button-icon-left"></i>
</p-button>
```

## Imágenes Servidas desde el Backend

**NUNCA construyas la URL de una imagen de forma manual** en un componente (ej. `environment.apiUrl.replace('/api','') + path`). Rompe en producción y acopla el componente a detalles de infraestructura.

✅ **PATRÓN CORRECTO: `MediaUrlPipe`**

El proyecto dispone de `MediaUrlPipe` en `shared/pipes/media-url.pipe.ts`. Úsalo siempre en el template para resolver rutas de imágenes del backend.

```typescript
// 1. Importar en el array imports[] del componente standalone
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  imports: [MediaUrlPipe, /* ...resto */],
})
```

```html
<!-- 2. Aplicar en el template con el operador pipe -->
<img [src]="player.thumbnailUrl | mediaUrl" [alt]="player.firstName" />
<img [src]="team.logo | mediaUrl" [alt]="team.name" />
```

**¿Por qué funciona?**
- El `proxy.conf.json` del dev-server de Angular redirige `/public` → `backend:3000/public`.
- En producción, el servidor estático (Nginx/Express) sirve la misma ruta relativa `/public/...`.
- Por eso basta con devolver el `path` tal cual — sin hardcodear hosts.

❌ **FORMA INCORRECTA:**
```typescript
// En el componente (crea acoplamiento y es frágil)
buildImageUrl(path: string) {
  return environment.apiUrl.replace('/api', '') + path;
}
```

## Signal Inputs

```typescript
// Required - must be provided by parent
name = input.required<string>();

// Optional with default value
count = input(0);

// Optional without default (undefined allowed)
label = input<string>();

// With alias for template binding
size = input('medium', { alias: 'buttonSize' });

// With transform function
disabled = input(false, { transform: booleanAttribute });
value = input(0, { transform: numberAttribute });
```

## Signal Outputs

```typescript
import { output, outputFromObservable } from '@angular/core';

// Basic output
clicked = output<void>();
selected = output<Item>();

// With alias
valueChange = output<number>({ alias: 'change' });

// From Observable (for RxJS interop)
scroll$ = new Subject<number>();
scrolled = outputFromObservable(this.scroll$);

// Emit values
this.clicked.emit();
this.selected.emit(item);
```

## Host Bindings

Use the `host` object in `@Component`—do NOT use `@HostBinding` or `@HostListener` decorators.

```typescript
@Component({
  selector: 'app-button',
  host: {
    // Static attributes
    'role': 'button',
    
    // Dynamic class bindings
    '[class.primary]': 'variant() === "primary"',
    '[class.disabled]': 'disabled()',
    
    // Dynamic style bindings
    '[style.--btn-color]': 'color()',
    
    // Attribute bindings
    '[attr.aria-disabled]': 'disabled()',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    
    // Event listeners
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onClick($event)',
    '(keydown.space)': 'onClick($event)',
  },
  template: `<ng-content />`,
})
export class Button {
  variant = input<'primary' | 'secondary'>('primary');
  disabled = input(false, { transform: booleanAttribute });
  color = input('#007bff');
  
  clicked = output<void>();
  
  onClick(event: Event) {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
```

## Content Projection

```typescript
@Component({
  selector: 'app-card',
  template: `
    <header>
      <ng-content select="[card-header]" />
    </header>
    <main>
      <ng-content />
    </main>
    <footer>
      <ng-content select="[card-footer]" />
    </footer>
  `,
})
export class Card {}

// Usage:
// <app-card>
//   <h2 card-header>Title</h2>
//   <p>Main content</p>
//   <button card-footer>Action</button>
// </app-card>
```

## Lifecycle Hooks

```typescript
import { OnDestroy, OnInit, afterNextRender, afterRender } from '@angular/core';

export class My implements OnInit, OnDestroy {
  constructor() {
    // For DOM manipulation after render (SSR-safe)
    afterNextRender(() => {
      // Runs once after first render
    });

    afterRender(() => {
      // Runs after every render
    });
  }

  ngOnInit() { /* Component initialized */ }
  ngOnDestroy() { /* Cleanup */ }
}
```

## Accessibility Requirements

Components MUST:
- Pass AXE accessibility checks
- Meet WCAG AA standards
- Include proper ARIA attributes for interactive elements
- Support keyboard navigation
- Maintain visible focus indicators

```typescript
@Component({
  selector: 'app-toggle',
  host: {
    'role': 'switch',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-label]': 'label()',
    'tabindex': '0',
    '(click)': 'toggle()',
    '(keydown.enter)': 'toggle()',
    '(keydown.space)': 'toggle(); $event.preventDefault()',
  },
  template: `<span class="toggle-track"><span class="toggle-thumb"></span></span>`,
})
export class Toggle {
  label = input.required<string>();
  checked = input(false, { transform: booleanAttribute });
  checkedChange = output<boolean>();
  
  toggle() {
    this.checkedChange.emit(!this.checked());
  }
}
```

## Template Syntax

Use native control flow—do NOT use `*ngIf`, `*ngFor`, `*ngSwitch`.

```html
<!-- Conditionals -->
@if (isLoading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  <app-content [data]="data()" />
}

<!-- Loops -->
@for (item of items(); track item.id) {
  <app-item [item]="item" />
} @empty {
  <p>No items found</p>
}

<!-- Switch -->
@switch (status()) {
  @case ('pending') { <span>Pending</span> }
  @case ('active') { <span>Active</span> }
  @default { <span>Unknown</span> }
}
```

## Class and Style Bindings

Do NOT use `ngClass` or `ngStyle`. Use direct bindings:

```html
<!-- Class bindings -->
<div [class.active]="isActive()">Single class</div>
<div [class]="classString()">Class string</div>

<!-- Style bindings -->
<div [style.color]="textColor()">Styled text</div>
<div [style.width.px]="width()">With unit</div>
```

## Images

Use `NgOptimizedImage` for static images:

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `
    <img ngSrc="/assets/hero.jpg" width="800" height="600" priority />
    <img [ngSrc]="imageUrl()" width="200" height="200" />
  `,
})
export class Hero {
  imageUrl = input.required<string>();
}
```

For detailed patterns, see [references/component-patterns.md](references/component-patterns.md).
