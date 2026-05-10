/**
 * Escribe web/src/app/core/build-config.generated.ts desde el entorno.
 * Prioridad: NX_API_URL → API_URL → http://localhost:3000/api
 * Ejecutado antes de `nx build web` (dependsOn) y en Docker con ARG/ENV NX_API_URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.join(__dirname, '..');
const outFile = path.join(workspaceRoot, 'web', 'src', 'app', 'core', 'build-config.generated.ts');

const raw = (process.env.NX_API_URL || process.env.API_URL || 'http://localhost:3000/api').trim();
const base = raw.replace(/\/+$/, '') || 'http://localhost:3000/api';

const content = `// Generado por scripts/write-build-api-url.mjs (NX_API_URL / API_URL). No editar a mano.
export const BUILD_API_URL = ${JSON.stringify(base)} as const;
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, content, 'utf8');
console.log('[write-build-api-url] BUILD_API_URL =', base);
