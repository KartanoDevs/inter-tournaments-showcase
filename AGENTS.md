# Inter AUU — Arquitectura de Agentes y Guía de Colaboración (AGENTS.md)

> Documento operativo para agentes de IA (Claude Code y similares) que colaboran en este repositorio.
> Su objetivo es que cualquier agente entienda **qué es la app, cómo está organizada, qué estética debe respetar y qué skill activar para cada tipo de tarea**.

---

## 1. Descripción de la Aplicación (Inter AUU / CV Inter)

El **Proyecto Inter AUU** es una plataforma web corporativa de gestión deportiva orientada al voleibol. Permite organizar eventos, gestionar clubes y realizar un seguimiento en tiempo real de ligas y torneos en formato Round Robin (todos contra todos). Está empaquetada también como **PWA instalable** (`CV Inter`, ver [manifest.webmanifest](frontend/public/manifest.webmanifest)) con orientación `landscape` pensada para el marcador a pantalla completa.

### Módulos principales
1. **Autenticación y Roles** — Control de acceso estricto basado en roles (`SUPERADMIN`, `ADMIN`, `COACH`, `PLAYER`) utilizando JWT.
2. **Entidades Deportivas (Club y Roster)** — Registro de clubes (`Club`), pabellones (`Venue`), horarios de entrenamiento (`Schedule`), equipos (`Team`) y fichas deportivas detalladas (`Player`).
3. **Torneos 4vs4 (sistema actual)** — Gestión de torneos pequeños (8 o 10 equipos): `Tournament`, `Tournament4v4Team`, `TournamentMatch`. Fase de grupos (`group: A|B`) seguida de fase eliminatoria (`phase: GROUP|QF|SF|THIRD|FINAL`). Clasificación calculada dinámicamente en el servicio (no se persiste). Endpoints en `/api/tournaments` ([tournament.routes.ts](backend/src/routes/tournament.routes.ts)); UI pública en [tournaments/](frontend/src/app/features/tournaments/) y panel admin en [admin-tournaments/](frontend/src/app/features/admin/admin-tournaments/).
4. **Eventos / Round Robin (legacy — en deprecación)** — `Event`, `EventTeam`, `EventPlayer` siguen en el esquema y montados en `/api/events` ([event.routes.ts](backend/src/routes/event.routes.ts)); **no usar para funcionalidad nueva**. Cualquier requisito de torneos pasa por el módulo 4vs4. No eliminar todavía: hay datos productivos.
5. **Patrocinadores** — Catálogo de sponsors (`Sponsor`) asociados a eventos o al club.
6. **Marcador Ficticio (Scoreboard)** — Vista independiente a pantalla completa para retransmisión en vivo, con modo restringido y controles táctiles. Ver [scoreboard.ts](frontend/src/app/features/scoreboard/scoreboard.ts).

---

## 2. Capa Directiva (Objetivo Global)

Mantener, escalar y desarrollar nuevas funcionalidades para la plataforma. El sistema es un monorepo con frontend (Angular v21) y backend API RESTful (Node.js + Express v5 + Prisma ORM + PostgreSQL), orquestados con Docker Compose y servidos en producción tras **Nginx Proxy Manager** (red externa `nginx-proxy-network` — ver [docker-compose.yml](docker-compose.yml)).

**Principios no negociables:**
- Alta cohesión, bajo acoplamiento.
- TypeScript estricto en ambos lados (paridad de tipos entre contratos Zod y modelos del frontend).
- Estética cyberpunk neón **consistente** (ver §6).
- Cambios reversibles, diffs pequeños, commits convencionales.

> El **estado actualizado del producto** (módulos completados, pendientes, stack y puesta en marcha) se mantiene en [README.md](README.md). Consúltalo antes de planificar cambios de alcance o nuevas funcionalidades.

---

## 3. Capa Orquestador

**Rol:** Arquitecto Principal / Project Manager.

**Responsabilidades:**
- Analizar la petición y decidir qué componentes del monorepo (Frontend, Backend, Base de Datos, Infra) requieren cambios.
- Asignar trabajo a los agentes especializados (§4).
- **Activar las skills correctas** (§5) según la naturaleza de la tarea, usando el mapeo de la §7.
- Supervisar la integración FE ↔ BE: los esquemas Zod del backend deben coincidir con los modelos del frontend y, cuando aplique, con `schema.prisma`.
- Verificar que cualquier cambio visual respete el design system de la §6.

---

## 4. Capa Agentes

### Agente Frontend
- **Rol:** Desarrollador Angular Senior.
- **Contexto:** Trabaja exclusivamente en [frontend/](frontend/).
- **Stack objetivo:** Angular v21, RxJS, Signals, PrimeNG, Bootstrap (utilidades CSS), FilePond, Vitest.
- **Reglas:**
  - Componentes **standalone** con `ChangeDetectionStrategy.OnPush`.
  - Inyección de dependencias moderna (`inject()`).
  - Estado reactivo nativo con `signal()`, `computed()`, `linkedSignal()`, `effect()`.
  - Inputs/outputs con `input()` / `output()` (sin decoradores antiguos).
  - Programación reactiva con RxJS solo donde aporta (HTTP, eventos UI complejos).
  - Toda la UI debe respetar el design system cyberpunk (§6) — **no inventar colores ni fuentes nuevas**.

### Agente Backend
- **Rol:** Desarrollador Node.js / Express Senior.
- **Contexto:** Trabaja exclusivamente en [backend/](backend/) y maneja la capa de datos ([backend/prisma/](backend/prisma/)).
- **Stack objetivo:** Express v5, Prisma ORM v7, Zod, PostgreSQL 15.
- **Reglas:**
  - Aprovechar el soporte nativo de promesas de Express 5 (sin `try/catch` redundantes; usar el middleware de errores centralizado).
  - Validación runtime estricta con **Zod** en cada endpoint.
  - Repositorios delgados sobre Prisma, servicios con la lógica de negocio, controladores que no acceden a `prisma` directamente.
  - Respetar la estructura existente: [controllers/](backend/src/controllers/), [services/](backend/src/services/), [repositories/](backend/src/repositories/), [middleware/](backend/src/middleware/), [di-container.ts](backend/src/di-container.ts).
  - Migraciones de esquema con `npx prisma migrate` documentadas en el plan.

### Agente DevOps / Infraestructura
- **Rol:** Ingeniero de Infraestructura.
- **Contexto:** [docker-compose.yml](docker-compose.yml), `Dockerfile` de cada servicio, y los scripts de la carpeta [scripts/](scripts/):
  - Despliegue: [scripts/deploy.sh](scripts/deploy.sh) (main), [scripts/deploy-4vs4.sh](scripts/deploy-4vs4.sh) (rama 4vs4).
  - Backup / restore: [scripts/backup-local.bat](scripts/backup-local.bat), [scripts/restore-prod.sh](scripts/restore-prod.sh), [scripts/restore-seed-db.bat](scripts/restore-seed-db.bat).
  - Operativa local: [scripts/build-containers.bat](scripts/build-containers.bat), [scripts/open-prisma-studio.bat](scripts/open-prisma-studio.bat).
- **Responsabilidades:**
  - Paridad dev/prod (puertos, volúmenes, redes externas — especialmente `nginx-proxy-network`).
  - Healthchecks PostgreSQL y dependencias correctas (`depends_on: condition: service_healthy`).
  - Persistencia de uploads en el volumen `uploads_data`.
  - Nunca commitear `.env.production` ni credenciales.

---

## 5. Skills disponibles

Hay **dos familias** de skills. Úsalas en conjunto, no son alternativas.

### 5.1 Skills Tecnológicas Locales ([.agents/skills/](.agents/skills/))

Guías técnicas instaladas en el repo bajo [.agents/skills/](.agents/skills/). El inventario y la procedencia de cada una se mantienen en [skills-lock.json](skills-lock.json) (campos: `name`, `path`, `description`, `source`, `version`, `local`, etc.). Cada subcarpeta contiene un `SKILL.md` que documenta cuándo y cómo aplicarla. Léelas antes de implementar; si añades una skill nueva, añade su entrada correspondiente en `skills-lock.json`.

| Skill | Cuándo usarla |
|---|---|
| [angular-component](.agents/skills/angular-component/) | Crear/refactorizar componentes Angular standalone, signals como I/O, host bindings, content projection. |
| [angular-routing](.agents/skills/angular-routing/) | Rutas, lazy loading, guards funcionales (`canActivate`), resolvers, lectura reactiva de parámetros. |
| [angular-rxjs-patterns](.agents/skills/angular-rxjs-patterns/) | Streams complejos, debounce, retry, multicast, operadores avanzados en servicios. |
| [angular-signals](.agents/skills/angular-signals/) | Estado reactivo con `signal`/`computed`/`linkedSignal`/`effect`. Prioritario sobre RxJS para estado local. |
| [clean-code](.agents/skills/clean-code/) | Naming, funciones cortas, cohesión, refactor seguro. Aplica en cualquier cambio no trivial. |
| [frontend-design](.agents/skills/frontend-design/) | Decisiones de diseño UI/UX de alto nivel. ⚠️ **Para este proyecto, primero la guía [cyberpunk-theme](.agents/skills/cyberpunk-theme/) y solo después esta** (esta puede sugerir otras paletas — no inventar, mantener neón). |
| [cyberpunk-theme](.agents/skills/cyberpunk-theme/) | **Design system real del proyecto**: paleta neón, tipografía Orbitron/Inter, scanlines CRT, glow, overrides de PrimeNG/FilePond. **Obligatoria en cualquier cambio visual.** |
| [git-commit](.agents/skills/git-commit/) | Mensajes Conventional Commits — sigue el patrón ya presente en `git log` (`feat[scope]:`, `chore[infra]:`, `fix[core]:`). |
| [nodejs-backend-patterns](.agents/skills/nodejs-backend-patterns/) | Estructura Express 5, DI nativa, controladores limpios, manejo centralizado de errores, middlewares de seguridad. |
| [prisma-expert](.agents/skills/prisma-expert/) | Diseño de schema, migraciones, consultas óptimas, relaciones, CRUD avanzado. |
| [responsive-design](.agents/skills/responsive-design/) | Layouts fluidos con CSS Grid/Flexbox, Container Queries, `clamp()`. Indispensable para el marcador (debe escalar de móvil a TV 4K). |
| [typescript-advanced-types](.agents/skills/typescript-advanced-types/) | Generics avanzados, tipos mapeados, inferencia, narrowing — útil para mantener paridad Zod ↔ modelos. |
| [vitest](.agents/skills/vitest/) | Tests unitarios rápidos en FE y BE. Consulta también [vitest/project-notes.md](.agents/skills/vitest/project-notes.md) para patrones específicos de este repo (TestBed con signals, mock del polling, gotcha de `MessageService` + Toast). |
| [writing-skills](.agents/skills/writing-skills/) | Mantener y mejorar documentación interna (incluye este AGENTS.md). |

### 5.2 Skills del Harness Claude Code (workflow)

Disponibles vía el tool `Skill` durante una sesión. Son **herramientas de proceso**, no de conocimiento técnico.

| Skill | Cuándo invocarla |
|---|---|
| `init` | Solo si no existiera `CLAUDE.md` y se quisiera regenerar uno. Hoy no aplica — preferir editar `AGENTS.md`. |
| `review` | Antes de abrir un PR, para una revisión estructurada del diff. |
| `security-review` | Cambios que tocan auth, JWT, manejo de archivos subidos, exposición de endpoints, sanitización de input. **Obligatorio si se modifica [auth/](frontend/src/app/features/auth/) o middleware/login del backend.** |
| `verify` | Tras cualquier cambio funcional, levantar la app y comprobar el flujo realmente (golden path + un edge case). |
| `run` | Lanzar la app/back/front cuando se necesita capturar pantalla o probar interactivamente. Usa los scripts [scripts/start-db.bat](scripts/start-db.bat), [scripts/start-backend.bat](scripts/start-backend.bat), [scripts/start-frontend.bat](scripts/start-frontend.bat). |
| `simplify` | Tras una primera implementación, antes del commit final, para detectar duplicación, código muerto o sobreabstracción. |
| `fewer-permission-prompts` | Si una sesión está pidiendo permisos repetidos para los mismos comandos de lectura. |
| `update-config` | Cambiar `settings.json` / hooks / variables de entorno del harness. No tocar a menos que el usuario lo pida. |
| `keybindings-help` | Solo si el usuario pregunta por atajos. |
| `loop` / `schedule` | Tareas recurrentes (polling de CI, recordatorios de despliegue). Uso reservado a petición explícita. |
| `claude-api` | **No aplica** — este proyecto no integra el SDK de Anthropic. Ignorar salvo que se añada esa integración. |

---

## 6. Sistema de Diseño — Cyberpunk Neón (canónico)

> Todo cambio visual **debe** respetar este sistema. La fuente de verdad es [frontend/src/styles.css](frontend/src/styles.css). La skill [cyberpunk-theme](.agents/skills/cyberpunk-theme/) lo expande con ejemplos.

### 6.1 Paleta (CSS variables, no hardcodear hex)
```css
--bg-dark:      #090B14;   /* Fondo principal */
--bg-card:      #12162D;   /* Superficie de tarjetas, paneles */
--neon-cyan:    #00E5FF;   /* Acento primario (acciones, foco, glow) */
--neon-magenta: #FF00FF;   /* Acento secundario (alertas, hovers destructivos, flicker) */
--text-main:    #FFFFFF;   /* Texto principal */
--text-muted:   #8AA4C8;   /* Texto secundario / placeholders */
```
- PWA theme color: `#00e5ff` · background: `#05050a` (`landscape` standalone).
- Fondo global: imagen [`/fondo.png`](frontend/public/fondo.png) en `cover` + `fixed`.
- **Prohibido** introducir morados pastel, gradientes genéricos, blancos planos, o paletas "AI-slop".

### 6.2 Tipografía
- **Display / Headings / Marcador:** `'Orbitron', sans-serif` (clase utilitaria `.orbitron-font`, `letter-spacing: 1.5px`).
- **Cuerpo / UI:** `'Inter', sans-serif`.
- Tamaños fluidos con `clamp(min, vw, max)` — patrón ya usado en `score-digit`, `team-name`, etc.

### 6.3 Efectos firmados (signature)
- **Scanlines CRT** globales (`body::after`, z-index 1050) — no eliminar.
- **Glow neón** vía utilidades `.glow-cyan`, `.text-glow-cyan`, `.text-glow-magenta`.
- **Flicker** `@keyframes neon-flicker` para títulos icónicos.
- **Pulse** `@keyframes pulse-glow` para indicar acciones activas/live.
- **Glassmorphism** en paneles: `background-color: rgba(18, 22, 45, 0.85)` + `backdrop-filter: blur(5px)`.
- **Scrollbars** custom (cyan → magenta en hover).

### 6.4 Overrides de librerías
- **PrimeNG**: variables override en `:root` (`--primary-color: var(--neon-magenta)`, etc.). Overlays (`p-select-overlay`, `p-dropdown-panel`, ...) deben tener `z-index: 1200` para visibilidad sobre modales.
- **FilePond**: panel con borde dasheado cyan, items con tinte cyan translúcido, botones de acción magenta en hover.
- **Bootstrap Utilities**: instalado solo como capa de utilidades de layout (`bootstrap-utilities.min.css` — NO el bundle completo). Usar clases `mb-*`, `mt-*`, `ms-*`, `me-*`, `p-*`, `d-flex`, `gap-*`, `text-*`, etc. directamente en plantillas. **No usar componentes Bootstrap** (modales, navbars, cards) — toda la UI de componentes viene de PrimeNG.

### 6.5 Reglas para nuevos componentes
1. Reutilizar variables CSS — **nunca** literales hex.
2. Cualquier card → `var(--bg-card)` con borde o glow neón.
3. Estado activo / focus → cyan; estado destructivo / alerta → magenta.
4. Animaciones cortas (≤ 300ms) salvo flicker/pulse que son ambientales.
5. Tipografías solo Orbitron (display) e Inter (body). Nada de Roboto, Arial, system-ui, Space Grotesk.

---

## 7. Mapeo "Tarea → Skills a activar"

| Tarea típica | Skills locales | Workflow harness |
|---|---|---|
| Nuevo componente visible | `angular-component` + `angular-signals` + `cyberpunk-theme` + `responsive-design` | `verify` |
| Nueva ruta / guard | `angular-routing` | — |
| Endpoint REST nuevo | `nodejs-backend-patterns` + `typescript-advanced-types` (Zod) + `vitest` | `security-review` si toca auth |
| Cambio de schema BD | `prisma-expert` + `nodejs-backend-patterns` | `verify` |
| Refactor de servicio | `clean-code` + (`angular-rxjs-patterns` o `angular-signals`) | `simplify` |
| Cambio CSS / estética | `cyberpunk-theme` (+ `frontend-design` solo si se pide rediseño) + `responsive-design`; usar Bootstrap utilities (`mb-*`, `d-flex`, etc.) para layout antes de escribir CSS custom | `verify` (capturas reales) |
| Tests | `vitest` | — |
| Cambios en Docker / despliegue | (no hay skill local específica — usar conocimiento general + leer [deploy.sh](deploy.sh)) | `verify` con `docker compose` |
| Commit / PR | `git-commit` | `review` antes de abrir PR |
| Documentación interna | `writing-skills` | Actualizar **ambos** docs si el cambio afecta módulos, stack o convenciones: `AGENTS.md` (guía operativa) y [README.md](README.md) (cara pública / estado del producto) |

---

## 8. Convenciones de commits

Sigue el formato ya presente en el historial: `tipo[scope]: descripción imperativa en minúsculas`.

Ejemplos reales del repo:
```
feat[infra]: configura contenedor frontend para Nginx Proxy Manager
feat[core]: implementa modo restringido de marcador
feat[pwa]: convierte la app en PWA instalable como CV Inter
chore[infra]: añade script de despliegue automatizado para produccion
```

Scopes habituales: `core`, `infra`, `pwa`, `auth`, `scoreboard`, `roster`, `admin`, `db`.

---

## 9. Capa de Salida (Producto Final)

**Artefactos esperados de cada tarea cerrada:**
- Código TypeScript con tipado estricto, sin `any` salvo justificación.
- Diffs pequeños, autocontenidos y revisables.
- Migraciones Prisma documentadas en el plan (nombre, motivo, reversibilidad).
- Tests Vitest verdes (al menos para la lógica nueva no trivial).
- UI verificada en navegador (cuando aplique) — captura o descripción del comportamiento.
- Commit en formato Conventional con scope.
- Sin regresiones visuales: el design system §6 sigue intacto.
- Si el cambio **añade, modifica o elimina un módulo, una ruta, una dependencia o el stack**, actualizar también [README.md](README.md) para mantenerlo veraz.

---

## 10. Patrones específicos del proyecto

### 10.1 Datos en vivo: polling con guard de visibilidad
Patrón usado en [tournaments.ts](frontend/src/app/features/tournaments/tournaments.ts):
- `interval(POLL_INTERVAL_MS).pipe(takeUntilDestroyed(destroyRef))` cada 5s.
- Filtrar `document.visibilityState === 'visible'` antes de pedir datos — no malgastar red con la pestaña oculta.
- Suscribirse también a `fromEvent(document, 'visibilitychange')` para refrescar inmediatamente al volver.
- Dedup en el front: comparar `JSON.stringify(prev)` vs el nuevo payload antes de reasignar el signal, así no se dispara `ChangeDetection` cuando la respuesta es idéntica.

### 10.2 Split admin / mobile en componentes presentacionales
Para tablas y filas de partidos hay dos jerarquías deliberadamente separadas:
- Admin (densidad alta, edición): [match-row.component.ts](frontend/src/app/features/admin/admin-tournaments/match-row.component.ts), [standings-table.component.ts](frontend/src/app/features/admin/admin-tournaments/standings-table.component.ts).
- Pública mobile-first (solo lectura, layout fluido con `clamp()`): [mobile-match-row.component.ts](frontend/src/app/features/tournaments/components/mobile-match-row.component.ts), [mobile-standings-table.component.ts](frontend/src/app/features/tournaments/components/mobile-standings-table.component.ts), [mobile-knockout-bracket.component.ts](frontend/src/app/features/tournaments/components/mobile-knockout-bracket.component.ts).

No fusionar las dos jerarquías con flags — son productos UX distintos. Si necesitas un nuevo bloque visual, decide primero a cuál lado pertenece.

---

## 11. Mantenimiento de este documento

Este AGENTS.md es **fuente de verdad operativa**. Cuando se incorporen nuevas skills locales, nuevos módulos del producto, o cambien convenciones, **actualiza este archivo en el mismo PR**. Para cambios mayores, activar la skill local `writing-skills`.

Para cambios que afectan al **producto visible** (módulos, stack, puesta en marcha, roadmap), actualizar también [README.md](README.md) en el mismo PR.
