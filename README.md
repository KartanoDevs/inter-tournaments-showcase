# 🏐 Inter AUU — CV Inter

> Plataforma web de gestión deportiva para voleibol, instalable como **PWA** (`CV Inter`).
> El foco de desarrollo actual es el **módulo de gestión de torneos 4vs4**.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?logo=pwa&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)

---

## Índice

- [¿Qué es?](#qué-es)
- [Módulos](#módulos)
- [Módulo de Torneos 4vs4](#módulo-de-torneos-4vs4-foco-actual)
- [Stack tecnológico](#stack-tecnológico)
- [Diseño](#diseño)
- [Arquitectura del repositorio](#arquitectura-del-repositorio)
- [Puesta en marcha (desarrollo local)](#puesta-en-marcha-desarrollo-local)
- [Variables de entorno](#variables-de-entorno)
- [Tests](#tests)
- [Backup automático a Dropbox (opcional)](#backup-automático-a-dropbox-opcional)
- [Despliegue](#despliegue)

---

## ¿Qué es?

**Inter AUU** (alias **CV Inter**) es una aplicación web para gestionar la actividad de un club de voleibol: equipos, fichas de jugadores, patrocinadores y, sobre todo, **torneos en formato 4vs4** con seguimiento en vivo. Incluye un **marcador a pantalla completa** para retransmisión y está empaquetada como **PWA instalable** con orientación `landscape`.

La aplicación luce un **tema cyberpunk neón** consistente (cyan/magenta, tipografía Orbitron/Inter, scanlines CRT). La guía operativa completa para colaboradores y agentes está en [AGENTS.md](AGENTS.md).

Es un **monorepo**: un frontend Angular y una API REST en Node.js, orquestados con Docker Compose.

---

## Módulos

| Módulo | Estado | Resumen |
|---|---|---|
| Autenticación y Roles | ✅ | JWT, roles `SUPERADMIN` / `ADMIN` / `COACH` / `PLAYER`, hash con argon2, *soft-delete* |
| Entidades deportivas (Club, Venue, Team, Player, Schedule) | ✅ | CRUD completo + subida de imágenes/logos |
| **Torneos 4vs4** | 🔄 **Foco actual** | Fase de grupos A/B + eliminatoria, sorteo, resultados, clasificación, horarios imprimibles y módulo de seguridad |
| Marcador (Scoreboard) | ✅ | Vista *fullscreen* para retransmisión en vivo, con persistencia local |
| Patrocinadores | ✅ | Catálogo de sponsors |
| Backup automático | ✅ | Snapshots locales del torneo + subida opcional a Dropbox |
| Eventos / Round Robin *(legacy)* | ⚠️ Deprecado | No usar para funcionalidad nueva; quedan datos productivos, no se elimina todavía |

---

## Módulo de Torneos 4vs4 (foco actual)

El núcleo de la app. Gestiona torneos pequeños de **8 o 10 equipos** con fase de grupos y eliminatoria.

### Ciclo de vida de un torneo

1. **Crear torneo** — el panel admin permite **un único torneo activo** a la vez (`MAX_TOURNAMENTS = 1`).
2. **Inscribir equipos** — añadir/quitar equipos antes del sorteo.
3. **Sorteo** — reparte los equipos en dos grupos (`A` / `B`) con *Fisher-Yates* y genera automáticamente el *round-robin* (todos contra todos) de cada grupo, equilibrando local/visitante.
4. **Resultados** — edición *inline* de marcadores por partido; la clasificación se recalcula al guardar.
5. **Fase eliminatoria** — se habilita solo cuando **todos los partidos de grupo están jugados** (y hay 8 o 10 equipos). Genera Cuartos (`QF`) y, al ir guardando resultados, **avanza automáticamente** a Semifinales (`SF`), Tercer puesto (`THIRD`) y Final (`FINAL`).

> Fases del partido: `GROUP | QF | SF | THIRD | FINAL`. Grupos: `A | B`.

### Clasificación

Se calcula dinámicamente en el servicio (no se persiste): partidos jugados, victorias, puntos a favor (PF), puntos en contra (PC) y diferencia. Orden de desempate: **victorias → diferencia → nombre**.

### Horario imprimible

Genera un documento por grupo con estética neón y un **código QR** que enlaza a la vista pública del torneo (`/torneos`), pensado para imprimir y colgar en el pabellón.

### Módulo de Seguridad (snapshots / backups)

- **Snapshots automáticos** ante cada acción crítica del torneo. *Triggers*: `draw`, `undo_draw`, `match_update`, `knockout`, `manual`, `restore`.
- **Listado paginado** de snapshots con su tipo, detalle, fecha y tamaño.
- **Restaurar** un snapshot (con confirmación: hay que escribir `RESTAURAR`), **descargar**, **borrar** y **subir** un JSON externo.
- **Exportación** del torneo a **CSV** y a **XLSX** con formato visual.

### Vista pública

En `/torneos` cualquier usuario ve el torneo en **solo lectura**, con **polling cada 5 s** (que se pausa cuando la pestaña no está visible, para no malgastar red). La interfaz pública usa componentes **mobile-first** dedicados (fila de partido, tabla de clasificación y *bracket* de eliminatoria).

> Nota de arquitectura: las vistas admin (densas, editables) y públicas (solo lectura, fluidas) son **jerarquías de componentes separadas a propósito** — ver [AGENTS.md §10.2](AGENTS.md).

---

## Stack tecnológico

### Frontend — [`frontend/`](frontend/)
- **Angular 21** con componentes *standalone*, **Signals** y `ChangeDetectionStrategy.OnPush`.
- **RxJS** para flujos asíncronos (HTTP, polling, eventos de UI).
- **PrimeNG** (componentes de UI) + **Bootstrap** (solo utilidades de layout, no el bundle de componentes).
- **FilePond** (subida de archivos), **qrcode** (generación de QR).
- **Service Worker** (`@angular/service-worker`) → PWA instalable.
- **Vitest** + jsdom para tests.

### Backend — [`backend/`](backend/)
- **Node.js + Express 5** (soporte nativo de promesas; manejo de errores centralizado).
- **Prisma ORM 5.x** sobre **PostgreSQL 15**.
- **Zod 4** para validación en *runtime* de cada endpoint.
- **argon2** (hash de contraseñas) + **JWT** (autenticación) + **Helmet** (cabeceras de seguridad).
- **Multer** (uploads), **xlsx-js-style** (export Excel con estilos), **Dropbox SDK** (backup opcional).
- **Vitest** para tests.

### Infraestructura
- **Docker** + **Docker Compose**; el frontend se sirve con **Nginx** (que además hace de *reverse proxy* hacia la API).

---

## Diseño

Tema **cyberpunk neón** canónico (la fuente de verdad es [`frontend/src/styles.css`](frontend/src/styles.css)):

- Paleta: fondo `#090B14`, tarjetas `#12162D`, acentos **cyan** `#00E5FF` y **magenta** `#FF00FF`.
- Tipografía: **Orbitron** (display/marcador) e **Inter** (cuerpo).
- Efectos firmados: scanlines CRT, *glow* neón, *glassmorphism*, *flicker*/*pulse* ambientales.

El detalle completo del *design system* (incluidos los *overrides* de PrimeNG/FilePond) está en [AGENTS.md §6](AGENTS.md).

> 📸 _Capturas de pantalla del módulo de torneos y del marcador: pendientes de añadir._

---

## Arquitectura del repositorio

```text
/
├── backend/                  # API REST (Node.js + Express 5 + Prisma)
│   ├── prisma/
│   │   └── schema.prisma     # Modelo de datos
│   ├── src/
│   │   ├── routes/           # Definición de endpoints
│   │   ├── controllers/      # Handlers (no acceden a Prisma directamente)
│   │   ├── services/         # Lógica de negocio (torneo, backups, Dropbox)
│   │   ├── repositories/     # Acceso a datos (Prisma)
│   │   ├── middleware/        # Auth (JWT/RBAC), errores, uploads
│   │   └── di-container.ts   # Inyección de dependencias
│   └── Dockerfile
├── frontend/                 # SPA Angular 21 (PWA)
│   ├── src/app/features/
│   │   ├── admin/            # Panel admin (torneos, equipos, jugadores)
│   │   ├── tournaments/      # Vista pública de torneos (+ componentes mobile)
│   │   ├── scoreboard/       # Marcador fullscreen
│   │   └── auth/             # Login
│   ├── src/app/shared/       # Servicios, modelos y componentes neón reutilizables
│   └── Dockerfile
├── scripts/                  # Arranque local (.bat) y deploy (.sh)
├── docker-compose.yml        # Orquestación: db + backend + frontend
└── AGENTS.md                 # Guía operativa, design system y convenciones
```

El backend sigue un patrón en capas: **controller → service → repository**, con validación Zod en la entrada y un *middleware* de errores centralizado.

---

## Puesta en marcha (desarrollo local)

### Prerrequisitos
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (gestor de paquetes del proyecto)
- [Docker Desktop](https://www.docker.com/) (para la base de datos)

> 💡 Si Docker en Windows falla con un error de credenciales, edita `~/.docker/config.json` y elimina la línea `"credsStore": "desktop"`.

### Versionado automático (una vez por clon)

El repositorio incluye un hook de git (`scripts/git-hooks/prepare-commit-msg`) que bumpeа automáticamente la versión en `frontend/package.json` y/o `backend/package.json` en cada commit, según las carpetas tocadas y el tipo [Conventional Commit](https://www.conventionalcommits.org/). Actívalo con:

```bash
git config core.hooksPath scripts/git-hooks
```

Reglas de bump: `feat` → minor · `fix`/`chore`/`docs`/`refactor`/… → patch · `feat!`/`BREAKING CHANGE` → major. Solo se toca la versión del proyecto cuyas carpetas (`frontend/`, `backend/`) estén en el stage del commit.

### Opción A — Scripts `.bat` (Windows)

La forma más rápida en local. Desde la raíz del proyecto:

```bat
scripts\start-db.bat                  :: Levanta PostgreSQL + prisma generate/db push
scripts\start-backend.bat             :: API en http://localhost:3000
scripts\start-frontend.bat            :: App en http://localhost:4200
```

Utilidad extra: `scripts\open-prisma-studio.bat` abre Prisma Studio (editor visual de la BD). Los scripts de seed de datos y de backup/restore contra producción se excluyeron de esta copia pública; crea un usuario desde Prisma Studio o directamente en la base de datos para probar el login.

### Opción B — Manual

**1. Base de datos (PostgreSQL):**
```bash
docker compose up -d db
```

**2. Backend (API + Prisma):**
```bash
cd backend
pnpm install
npx prisma generate
npx prisma db push
pnpm dev           # → http://localhost:3000
```

**3. Frontend (Angular):**
```bash
cd frontend
pnpm install
pnpm start         # → http://localhost:4200
```

---

## Variables de entorno

El backend se configura por entorno. Plantilla completa en [`backend/.env.production.example`](backend/.env.production.example). **Nunca** subas tu `.env.production` al repositorio.

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor Express (por defecto `3000`) |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (`postgresql://usuario:pass@db:5432/bd?schema=public`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales del servicio de base de datos |
| `JWT_SECRET` | Clave de firma de los tokens JWT (≥ 64 caracteres aleatorios) |
| `JWT_EXPIRES_IN` | Caducidad del token (p. ej. `7d`) |
| `ALLOWED_ORIGINS` | Orígenes permitidos por CORS (dominio o IP del servidor) |

**Dropbox (opcional)** — dejar las tres primeras vacías desactiva la subida:

| Variable | Descripción |
|---|---|
| `DROPBOX_APP_KEY` | App key de la app de Dropbox |
| `DROPBOX_APP_SECRET` | App secret |
| `DROPBOX_REFRESH_TOKEN` | Refresh token permanente (OAuth) |
| `DROPBOX_BACKUP_FOLDER` | Carpeta raíz de backups en Dropbox (debe empezar por `/`) |

---

## Tests

Ambos lados usan **Vitest**.

```bash
# Frontend (Vitest vía ng test, entorno jsdom)
cd frontend && pnpm test

# Backend (Vitest)
cd backend && pnpm test
```

El módulo de torneos cuenta con **amplia cobertura**: lógica de sorteo, cálculo de clasificación, gestión de snapshots y generación del XLSX, además de los componentes de UI (filas de partido, tablas de clasificación, marcador).

---

## Backup automático a Dropbox (opcional)

Además de los snapshots locales, el backend puede subir **automáticamente** una copia de cada snapshot a Dropbox (un `.json` + un `.xlsx`) en la ruta `/<carpeta>/<idTorneo>/`. Es **best-effort**: si falla, se registra el error pero no bloquea la operación del torneo.

Setup resumido:
1. Crea una app en [dropbox.com/developers/apps](https://www.dropbox.com/developers/apps) (*Scoped Access*, *Full Dropbox*) con el permiso `files.content.write`.
2. Obtén un **refresh token** permanente mediante el flujo OAuth *offline*.
3. Rellena `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` y `DROPBOX_BACKUP_FOLDER` en tu `.env.production`.
4. Reconstruye el backend (`docker compose build backend && docker compose up -d`).

> Si dejas las credenciales de Dropbox vacías, la app funciona igual: solo se guardan los snapshots locales (descargables desde el panel admin).

---

## Despliegue

En producción la aplicación corre sobre **Docker Compose** (base de datos + API + frontend con Nginx) detrás de **Nginx Proxy Manager** (red Docker externa `nginx-proxy-network`), alojada en un VPS (Oracle Cloud) y servida bajo un dominio propio.

El despliegue está automatizado con scripts en [`scripts/`](scripts/):
- [`scripts/deploy.sh`](scripts/deploy.sh) — despliegue de la rama `main`.
- [`scripts/deploy-4vs4.sh`](scripts/deploy-4vs4.sh) — despliegue de la rama `4vs4`.

