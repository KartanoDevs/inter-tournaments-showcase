---
name: cyberpunk-theme
description: Design system real del proyecto Inter AUU / CV Inter. Paleta neón, tipografías Orbitron + Inter, efectos cyberpunk (scanlines CRT, glow, flicker, pulse), glassmorphism y overrides de PrimeNG/FilePond. Úsala SIEMPRE que se cree o modifique UI en este repositorio. Tiene precedencia sobre la skill genérica frontend-design (que sugiere paletas alternativas — aquí no se inventa, se mantiene la estética existente).
---

# Cyberpunk Theme — Inter AUU / CV Inter

Esta skill describe **el sistema visual real** del proyecto. La fuente de verdad es [frontend/src/styles.css](../../../frontend/src/styles.css) y el manifest PWA [frontend/public/manifest.webmanifest](../../../frontend/public/manifest.webmanifest). Esta guía existe para que ningún agente introduzca colores, fuentes o efectos que rompan la coherencia.

> **Regla de oro**: si necesitas un color, una fuente o un efecto y *no* aparece en este documento, **pregunta antes de inventarlo**.

---

## 1. Cuándo aplicar esta skill

Actívala en cualquiera de estos casos:
- Creas o modificas un componente Angular con plantilla visible.
- Tocas cualquier `.css`/`.scss` del frontend.
- Añades una librería UI nueva (necesitará overrides de tema).
- Diseñas una vista nueva del marcador, roster, admin, home, contact o auth.
- Generas activos gráficos (placeholders SVG, iconos, splash de PWA).

No la apliques si: trabajas sólo en backend, scripts de infraestructura, prisma schema o tests sin UI.

---

## 2. Paleta canónica

Definida como CSS variables en `:root`. **Nunca uses los literales hex directamente** — referencia siempre la variable:

```css
:root {
  /* Fondos */
  --bg-dark:      #090B14;   /* Lienzo principal */
  --bg-card:      #12162D;   /* Tarjetas, paneles, modales */

  /* Acentos neón */
  --neon-cyan:    #00E5FF;   /* Primario: foco, acciones, info, links */
  --neon-magenta: #FF00FF;   /* Secundario: hover destructivo, alertas, flicker */

  /* Texto */
  --text-main:    #FFFFFF;
  --text-muted:   #8AA4C8;
}
```

**Mapeo semántico (memorizarlo):**
| Intención | Variable |
|---|---|
| Acción primaria, focus, "vivo" | `--neon-cyan` |
| Destructivo, alerta, énfasis dramático | `--neon-magenta` |
| Texto sobre fondo oscuro | `--text-main` |
| Texto secundario, placeholder, hint | `--text-muted` |
| Cualquier superficie elevada | `--bg-card` con transparencia 0.7–0.85 |

**Constantes PWA** (para `manifest.webmanifest` y splash):
- `theme_color`: `#00e5ff`
- `background_color`: `#05050a`
- `display`: `standalone`
- `orientation`: `landscape` (el marcador es la vista hero)

---

## 3. Tipografía

| Uso | Fuente | Detalles |
|---|---|---|
| Headings, marcador, badges, etiquetas técnicas | `'Orbitron', sans-serif` | `letter-spacing: 1.5px`, `font-weight: 400` (el glow hace el efecto bold). Disponible vía `.orbitron-font`. |
| Cuerpo, formularios, párrafos | `'Inter', sans-serif` | Peso 400–600. |

**Fuentes prohibidas** (rompen la estética): Roboto, Arial, system-ui, Space Grotesk, Poppins, Open Sans, Helvetica, Georgia.

**Escalas fluidas**: usa siempre `clamp(min, vw|vh, max)` para tamaños que deban escalar — el marcador debe verse desde móvil hasta TV 4K. Patrón ya en uso:
```css
font-size: clamp(4rem, 14vw, 9rem);   /* score-digit */
font-size: clamp(0.9rem, 3.5vw, 2rem); /* team-name */
```

---

## 4. Efectos firmados (signature effects)

Estos efectos definen la identidad visual. No los reemplaces sin consenso explícito.

### 4.1 Scanlines CRT (globales)
```css
body::after {
  content: "";
  position: fixed; inset: 0;
  background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%);
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 1050;
}
```
Convive con overlays PrimeNG (z-index 1200) y dialog-host (1100). **No subas el z-index** de las scanlines.

### 4.2 Glow utilidades
```css
.glow-cyan        { box-shadow: 0 0 5px var(--neon-cyan), inset 0 0 5px var(--neon-cyan); border: 2px solid var(--neon-cyan); }
.text-glow-cyan   { text-shadow: 0 0 8px var(--neon-cyan); color: var(--neon-cyan); }
.text-glow-magenta{ text-shadow: 0 0 8px var(--neon-magenta); color: var(--neon-magenta); animation: neon-flicker 20s infinite alternate; }
```

### 4.3 Animaciones reutilizables
- `@keyframes neon-flicker` — parpadeo eléctrico para títulos icónicos.
- `@keyframes pulse-glow` — pulso radial cyan para indicar "live" / acción reciente.
- `@keyframes fade-in-down` — entrada suave (úsala con moderación, máx una vez por vista).

### 4.4 Glassmorphism (paneles)
```css
background-color: rgba(18, 22, 45, 0.85);
backdrop-filter: blur(5px);
-webkit-backdrop-filter: blur(5px);
border-radius: 8–12px;
```

### 4.5 Scrollbars
Cyan en reposo, magenta en hover, grosor 6px. Ya definido globalmente — no overridear por componente.

---

## 5. Overrides de librerías

### 5.1 PrimeNG
- Variables override en `:root` (`--primary-color: var(--neon-magenta)`, `--surface-ground`, `--surface-card`, `--text-color`, `--text-color-secondary`).
- **Overlays que usan `appendTo="body"`** (p-select, p-dropdown, p-autocomplete, p-overlaypanel, p-multiselect) deben tener `z-index: 1200 !important` para visibilidad sobre el dialog-host (1100). Patrón ya definido — extiéndelo si usas un componente nuevo.

### 5.2 FilePond
- Panel raíz: fondo `rgba(18,22,45,0.7)` + borde dasheado cyan + `backdrop-filter: blur(5px)`.
- Items aceptados: tinte cyan translúcido + borde cyan.
- Botones de acción: fondo oscuro semitransparente, **hover magenta con glow**.
- Indicador de éxito: cyan.

### 5.3 Bootstrap Utilities (layout helpers)
Bootstrap está instalado **solo como capa de utilidades CSS** (`bootstrap-utilities.min.css`).
Úsalo para spacing, flex, display y alineación de layout:
- Spacing: `mb-1…5`, `mt-*`, `ms-*`, `me-*`, `p-*`, `px-*`, `py-*`
- Flex: `d-flex`, `flex-column`, `align-items-*`, `justify-content-*`, `gap-*`
- Display: `d-none`, `d-block`, `d-md-flex`, etc.
- Texto: `text-center`, `text-end`, `text-truncate`

**No usar:** componentes Bootstrap (`.btn`, `.card`, `.modal`, `.navbar`, `.badge`) — toda la UI de componentes proviene de PrimeNG. Los colores y efectos siguen siendo exclusivamente los de la paleta neón (§2).

### 5.4 Cualquier librería nueva
1. Crea un bloque dedicado en `styles.css` con cabecera en mayúsculas:
   ```css
   /* ==========================================================================
      <LIBRERÍA> GLOBAL OVERRIDES (NEON CYBERPUNK THEME)
      ========================================================================== */
   ```
2. Usa exclusivamente las variables de la §2.
3. Documenta cualquier `!important` con un comentario explicando por qué (normalmente: ganarle a la especificidad de la librería).

---

## 6. Patrones de componente

### 6.1 Card / Panel
```css
.my-card {
  background-color: rgba(18, 22, 45, 0.85);
  border: 1px solid rgba(0, 229, 255, 0.2);
  border-radius: 12px;
  padding: clamp(0.75rem, 2vw, 1.5rem);
  backdrop-filter: blur(5px);
}
.my-card:hover {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.25);
}
```

### 6.2 Botón primario
- Fondo translúcido (`rgba(0, 229, 255, 0.05–0.15)`).
- Borde cyan 2px, glow cyan inset + outer.
- Texto Orbitron uppercase, `letter-spacing: 1px`.
- `:active` reduce escala (`transform: scale(0.95)`).

### 6.3 Botón destructivo
- Mismo patrón pero con `--neon-magenta`.
- En `:hover` el glow magenta debe ser **más intenso** que el cyan equivalente (10–12px box-shadow).

### 6.4 Input inline editable (al estilo `team-name-input` del scoreboard)
- `background: transparent`, `border: none`, `border-bottom: 1px solid rgba(0,255,251,0.5)`.
- `caret-color: var(--neon-cyan)`.
- `:focus` → `border-bottom-color: var(--neon-cyan)` + `box-shadow: 0 2px 0 0 rgba(0,255,251,0.35)`.

### 6.5 Badge / Chip
- Border-radius 20px, padding `0.2rem 0.6rem`.
- Borde `rgba(0,255,251,0.2)`, hover cyan + glow ligero.

---

## 7. Antipatrones (no hacer)

| ❌ Evitar | ✅ Sustituir por |
|---|---|
| Gradientes morados pastel sobre blanco | Sólidos `--bg-card` con borde neón |
| `background: white` o `#fff` en cards | `var(--bg-card)` con transparencia |
| Fuentes Roboto / Arial / system-ui | Orbitron (display) + Inter (body) |
| `box-shadow` grises difusas estilo Material | Glow cyan/magenta con `text-shadow` o `box-shadow` saturado |
| Iconos planos monocromos grises | Iconos con `color: var(--neon-cyan)` y opcional `text-shadow` glow |
| Animaciones > 500ms por defecto | Transiciones 150–300ms; reservar largas para `flicker`/`pulse` ambientales |
| Bordes 1px sólidos grises | Bordes 1–2px en cyan/magenta o transparencias del mismo |
| Literales hex hardcodeados | CSS variables del `:root` |

---

## 8. Checklist antes de cerrar un cambio visual

- [ ] Todos los colores referencian variables CSS (`var(--…)`).
- [ ] Solo se usan Orbitron e Inter.
- [ ] Los tamaños críticos usan `clamp()` para escalar.
- [ ] Las superficies elevadas usan transparencia + `backdrop-filter`.
- [ ] Estados `:hover` y `:focus` usan glow neón, no sombras grises.
- [ ] Si añadiste una librería UI: bloque de overrides en `styles.css` y z-index correcto para overlays.
- [ ] Si usas clases de layout (flex, spacing), prefieres las Bootstrap utilities (`mb-*`, `d-flex`, `gap-*`) antes de escribir CSS custom redundante.
- [ ] No introdujiste fuentes nuevas, gradientes pastel ni iconos planos genéricos.
- [ ] Las scanlines CRT siguen visibles sobre el nuevo contenido (no las tapaste con un z-index superior).
- [ ] Verificación visual real (skill `verify` del harness) en al menos un breakpoint móvil y uno desktop.

---

## 9. Referencias rápidas

- **Variables y utilidades globales:** [frontend/src/styles.css](../../../frontend/src/styles.css)
- **Ejemplo canónico de componente cyberpunk:** [frontend/src/app/features/scoreboard/scoreboard.css](../../../frontend/src/app/features/scoreboard/scoreboard.css)
- **PWA / branding:** [frontend/public/manifest.webmanifest](../../../frontend/public/manifest.webmanifest)
- **Fondo global:** `frontend/public/fondo.png` (servido en `/fondo.png`)
