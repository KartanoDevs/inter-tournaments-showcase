---
name: git-commit
description: 'Execute git commit + push with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit". Supports: (1) Auto-detecting type and scope from changes, (2) Generating conventional commit messages from diff, (3) Intelligent file staging for logical grouping, (4) Automatic push to current remote branch after commit.'
license: MIT
allowed-tools: Bash
---

# Git Commit + Push — Inter AUU

## Reglas de oro

1. El mensaje SIEMPRE en **español** (tipo y scope en inglés; descripción, cuerpo y footer en español).
2. **Siempre usar HEREDOC** para el mensaje (incluso si es de una sola línea).
3. **Siempre hacer push** al remote tras el commit, salvo que el usuario diga explícitamente "sin push".
4. La última línea del commit es siempre `Co-Authored-By: Claude <modelo> <noreply@anthropic.com>`.
5. No agrupar en un mismo commit cambios no relacionados.
6. Nunca commitear `.env`, credenciales, ni ficheros binarios grandes.

---

## Formato de commit

```
<type>[scope]: <descripción en español, imperativo, ≤72 chars>

- bullet de cambio 1
- bullet de cambio 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Tipos

| Tipo       | Cuándo                         |
| ---------- | ------------------------------ |
| `feat`     | Nueva funcionalidad            |
| `fix`      | Corrección de bug              |
| `chore`    | Mantenimiento / misc           |
| `refactor` | Refactor sin cambio funcional  |
| `test`     | Añadir / actualizar tests      |
| `style`    | Formato / CSS (sin lógica)     |
| `docs`     | Documentación                  |
| `perf`     | Mejora de rendimiento          |
| `build`    | Dependencias / build system    |
| `ci`       | CI / configuración del harness |
| `revert`   | Revertir un commit             |

### Scopes habituales del proyecto

`core` · `infra` · `pwa` · `auth` · `scoreboard` · `roster` · `admin` · `db` · `torneos` · `cleanup` · `tests` · `scripts`

---

## Workflow paso a paso

### 1. Analizar el estado

```bash
git status --porcelain
git diff --staged   # si hay staged
git diff            # si no hay staged
git log --oneline -5
```

### 2. Seleccionar ficheros a stagear

Stagea solo los ficheros del cambio lógico actual. **Nunca** `git add -A` sin revisar qué hay pendiente de sesiones anteriores.

```bash
git add path/to/file1 path/to/file2
```

### 3. Generar el mensaje

- Analiza el diff para determinar tipo, scope y descripción.
- Descripción: presente de imperativo en español, ≤ 72 caracteres (e.g., "añade validación de email", "corrige constraint único de partidos").
- Cuerpo: bullets con los cambios concretos.
- Footer: `Co-Authored-By` con el modelo activo de la sesión.

### 4. Hacer el commit con HEREDOC

```bash
git commit -m "$(cat <<'EOF'
type[scope]: descripción en español

- cambio 1
- cambio 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 5. Push automático

Tras el commit, **siempre** hacer push a la rama actual:

```bash
git push origin <rama-actual>
```

Si la rama no tiene upstream todavía:

```bash
git push -u origin <rama-actual>
```

---

## Co-Authored-By según modelo activo

| Modelo en sesión     | Línea Co-Authored-By                                          |
| -------------------- | ------------------------------------------------------------- |
| claude-opus-4-7      | `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`     |
| claude-sonnet-4-6    | `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`   |
| claude-haiku-4-5     | `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`    |

Usa la que corresponda al modelo de la sesión actual.

---

## Protocolo de seguridad

- NUNCA modificar la config de git.
- NUNCA usar `--no-verify` salvo petición explícita del usuario.
- NUNCA hacer force-push a `main` o `master`.
- Si el commit falla por un hook: corregir el problema y crear un commit NUEVO (no `--amend`).
- NUNCA hacer push si el usuario dice "sin push" o "solo commit".
