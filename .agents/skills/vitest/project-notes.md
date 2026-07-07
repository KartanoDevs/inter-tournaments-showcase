# Vitest — Notas específicas del proyecto Inter AUU

Complemento al `SKILL.md` genérico. Lee primero el genérico, luego este.

## Stack
- Vitest 4.x + Angular 21 TestBed + jsdom.
- Builder `@angular/build:unit-test` (Angular CLI). Sin Karma.
- Script: `npm test` (alias de `ng test`).
- Hay 226 tests verdes a fecha 2026-05-26 — úsalos como referencia viva, no copies este documento textualmente.

## Patrón estándar de un spec de componente standalone con signals

1. **Factories tipadas** al inicio del fichero (`makeTeam`, `makeMatch`, `makeTournament`, `makeStandings`). Usa el tipo real del modelo y deja `overrides: Partial<T>` para personalizar cada test.
2. **Mock del servicio como objeto plano** declarado en `beforeEach`:
   ```ts
   svc = {
     getAll: vi.fn().mockReturnValue(of({ status: 'success', data: [] })),
     getById: vi.fn().mockReturnValue(of({ status: 'success', data: makeTournament() }))
   };
   ```
3. **TestBed**:
   ```ts
   await TestBed.configureTestingModule({
     imports: [Componente],
     providers: [{ provide: Servicio, useValue: svc }]
   }).compileComponents();
   fixture = TestBed.createComponent(Componente);
   component = fixture.componentInstance;
   fixture.detectChanges();
   ```
4. **Signals**: leer con `component.signal()`, escribir con `component.signal.set(v)` o `component.signal.update(fn)`. Para `computed`, leer directamente — se recalcula al cambiar el upstream.
5. **`effect()` y `setTimeout`/polling**: `vi.useFakeTimers()` + `vi.advanceTimersByTime(ms)`. Restaurar con `afterEach(() => vi.useRealTimers())`.
6. **Servicios HTTP**: `provideHttpClient()` + `provideHttpClientTesting()` + `HttpTestingController` con `http.verify()` en `afterEach`. Verifica URL, verbo, body.

Ver [tournament.service.spec.ts](../../../frontend/src/app/shared/services/tournament.service.spec.ts), [admin-tournaments.spec.ts](../../../frontend/src/app/features/admin/admin-tournaments/admin-tournaments.spec.ts) y [tournaments.spec.ts](../../../frontend/src/app/features/tournaments/tournaments.spec.ts) como referencia.

## ⚠️ Gotcha: providers a nivel de componente sombrean los del TestBed

`AdminTournaments` declara `providers: [MessageService]` en el decorador `@Component`. Si mockeas `MessageService` con `{ provide: MessageService, useValue: mockMsg }` en `TestBed.configureTestingModule(...)`, la instancia del componente **NO** usa tu mock — usa la del provider local.

Además, intentar reemplazarlo con `TestBed.overrideComponent(C, { set: { providers: [...] } })` con un mock plano (`{ add: vi.fn() }`) **rompe `<p-toast>` de PrimeNG**: el componente Toast se suscribe a `messageObserver` y propiedades internas del MessageService real, y un mock plano dispara `Cannot read properties of undefined (reading 'subscribe')` en `Toast.onInit`.

### Solución
Espiar la instancia REAL inyectada en el componente:

```ts
fixture = TestBed.createComponent(AdminTournaments);
component = fixture.componentInstance;
const realMsg = fixture.debugElement.injector.get(MessageService);
const addSpy = vi.spyOn(realMsg, 'add');
fixture.detectChanges();
// ... aserciones con addSpy.toHaveBeenCalledWith(...)
```

Aplica a cualquier servicio listado en `providers: [...]` a nivel componente.

## Casos comunes

- **Polling 5s + visibilitychange**: ver `tournaments.spec.ts`. Necesario `vi.useFakeTimers()` antes del `setup()`, spy de `document.visibilityState` con `vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible' | 'hidden')`, y luego `vi.advanceTimersByTime(5000)`. Sin el spy de `visibilityState`, el guard del polling lo silencia y los tests fallan en silencio.
- **`localStorage` + `effect`**: ver `scoreboard.spec.ts`. El `effect` se ejecuta al crear el componente; para forzar una nueva ejecución tras un cambio de signal en mitad del test, usa `TestBed.tick()` o `fixture.detectChanges()`. `localStorage.clear()` en `beforeEach` para aislar tests.
- **Mensajes de error con `err.error?.message`**: el mock debe rechazar con `throwError(() => ({ error: { message: 'X' } }))`, **NO** con `new Error('X')`. Si rechazas con un `Error` real, `err.error` es `undefined` y el componente nunca extrae el mensaje, así que el toast esperado no llega.
- **Componentes presentacionales con `By.css`**: para validar clases CSS condicionales, usa `fixture.debugElement.query(By.css('.match-row'))` y asserts contra `el.nativeElement.classList`. Ver `match-row.component.spec.ts`.

## Anti-patrones a evitar

- ❌ Re-implementar un mock del `MessageService` con `messageObserver`/`clearObserver`. Es frágil y se rompe con cualquier update de PrimeNG. Espía la instancia real (ver arriba).
- ❌ Llamar a `tick()`/`fakeAsync` (zone.js) en estos specs — el proyecto está sobre signals + Vitest, sin zone testing. Usa `vi.useFakeTimers()` + `vi.advanceTimersByTime()`.
- ❌ Lanzar `fixture.detectChanges()` después de cada `signal.set` solo "por si acaso". Con signals + computed normalmente no es necesario; añade ruido y oculta bugs de invalidación.
- ❌ Probar `await new Promise(r => setTimeout(r, 5000))` en lugar de timers fake. Hace los tests lentos sin razón.
