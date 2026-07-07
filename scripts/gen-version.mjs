#!/usr/bin/env node
/**
 * gen-version.mjs
 *
 * Reads version from backend/package.json and frontend/package.json
 * and generates frontend/src/environments/version.ts so Angular can
 * import both versions at build/start time.
 *
 * Called automatically via prestart / prebuild scripts in frontend/package.json.
 * The generated file is git-ignored (it is always derived from package.json).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const frontendVersion = JSON.parse(
  readFileSync(resolve(ROOT, 'frontend', 'package.json'), 'utf8')
).version;

const backendVersion = JSON.parse(
  readFileSync(resolve(ROOT, 'backend', 'package.json'), 'utf8')
).version;

const outPath = resolve(ROOT, 'frontend', 'src', 'environments', 'version.ts');

const content = `// AUTO-GENERATED — do not edit manually.
// Regenerated on every \`pnpm start\` / \`pnpm build\` via scripts/gen-version.mjs
export const VERSIONS = {
  frontend: '${frontendVersion}',
  backend:  '${backendVersion}',
} as const;
`;

writeFileSync(outPath, content, 'utf8');
console.log(`[gen-version] frontend v${frontendVersion} · backend v${backendVersion} → ${outPath}`);
