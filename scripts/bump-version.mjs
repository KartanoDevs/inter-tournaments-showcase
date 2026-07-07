#!/usr/bin/env node
/**
 * bump-version.mjs
 *
 * Llamado desde el hook post-commit. Lee el último commit, determina qué proyectos
 * tocó (frontend/ y/o backend/) y el nivel de bump según Conventional Commits,
 * luego actualiza los package.json correspondientes y crea un commit separado.
 *
 * Guard anti-bucle: si el último commit ya es un chore[versions], sale sin hacer nada.
 *
 * Bump rules (Conventional Commits, tolera [scope] y (scope)):
 *   BREAKING CHANGE en el cuerpo, o ! tras tipo/scope  → major
 *   feat                                               → minor
 *   resto (fix, chore, docs, refactor…)                → patch
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── 1. Guard anti-bucle ───────────────────────────────────────────────────────
const lastSubject = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
if (lastSubject.startsWith('chore[versions]')) {
  process.exit(0);
}

// ── 2. Archivos del último commit ─────────────────────────────────────────────
let changedFiles;
try {
  changedFiles = execSync('git diff HEAD~1 HEAD --name-only', { encoding: 'utf8' });
} catch {
  // Si no hay HEAD~1 (primer commit del repo), salir
  process.exit(0);
}

const affectsFrontend = changedFiles.split('\n').some(f => f.startsWith('frontend/'));
const affectsBackend  = changedFiles.split('\n').some(f => f.startsWith('backend/'));

if (!affectsFrontend && !affectsBackend) {
  process.exit(0); // commit neutro (docs, scripts, docker…)
}

// ── 3. Mensaje del último commit ──────────────────────────────────────────────
const commitMsg = execSync('git log -1 --format=%B', { encoding: 'utf8' });

// ── 4. Nivel de bump ──────────────────────────────────────────────────────────
function detectBumpLevel(msg) {
  const firstLine = msg.split('\n')[0].trim();
  if (msg.includes('BREAKING CHANGE')) return 'major';
  if (/^\w+(\[[^\]]*\]|\([^)]*\))?!:/.test(firstLine)) return 'major';
  if (/^feat(\[[^\]]*\]|\([^)]*\))?[!:]/.test(firstLine)) return 'minor';
  return 'patch';
}

const bumpLevel = detectBumpLevel(commitMsg);

// ── 5. Bump semver ────────────────────────────────────────────────────────────
function bumpSemver(version, level) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver: "${version}"`);
  }
  let [major, minor, patch] = parts;
  if (level === 'major') { major++; minor = 0; patch = 0; }
  else if (level === 'minor') { minor++; patch = 0; }
  else { patch++; }
  return `${major}.${minor}.${patch}`;
}

// ── 6. Actualizar package.json ────────────────────────────────────────────────
const bumped = [];

function bumpPackageJson(target) {
  const pkgPath = resolve(ROOT, target, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version;
  const newVersion = bumpSemver(oldVersion, bumpLevel);
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  execSync(`git add "${pkgPath}"`);
  console.log(`  ↑ ${target.padEnd(8)} ${oldVersion} → ${newVersion}  (${bumpLevel})`);
  bumped.push(`${target} → v${newVersion}`);
}

console.log('[bump-version]');
if (affectsFrontend) bumpPackageJson('frontend');
if (affectsBackend)  bumpPackageJson('backend');

// ── 6b. Regenerar version.ts (versionado en git) con las versiones nuevas ─────
// version.ts NO se genera dentro de Docker (el prebuild fue eliminado); se commitea
// aquí para que el servidor lo reciba con el git pull.
execSync(`node "${resolve(ROOT, 'scripts', 'gen-version.mjs')}"`, { stdio: 'inherit' });
execSync(`git add "${resolve(ROOT, 'frontend', 'src', 'environments', 'version.ts')}"`);

// ── 7. Commit separado de versiones ──────────────────────────────────────────
const scope  = affectsFrontend && affectsBackend ? 'front+back' :
               affectsFrontend ? 'frontend' : 'backend';
const detail = bumped.join(', ');

execSync(
  `git commit -m "chore[versions]: bump ${scope} — ${detail}"`,
  { stdio: 'inherit' }
);
