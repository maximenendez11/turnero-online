import { join } from 'path';

/**
 * Carpeta base de uploads (imágenes/vídeos de slides).
 * Si el proceso se ejecuta desde api/, usa workspace root/uploads para que
 * sirva tanto con "nx serve" (cwd = root) como con nodemon (cwd = api).
 */
export function getUploadsDir(): string {
  const cwd = process.cwd();
  return cwd.endsWith('api') ? join(cwd, '..', 'uploads') : join(cwd, 'uploads');
}
