import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { request } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Runs once before the whole run:
 *  1. env is validated (only localhost) on import of src/config/env;
 *  2. optional DB reset (RESET_DB=true) — once, before workers start, so parallel tests are not affected;
 *  3. smoke-check that UI and API are up and the catalog is seeded.
 */
export default async function globalSetup(): Promise<void> {
  if (env.RESET_DB) {
    const appDir = resolve(env.APP_DIR);
    execSync('docker compose exec -T laravel-api php artisan migrate:fresh --seed', { cwd: appDir, stdio: 'inherit' });
  }

  const api = await request.newContext({ baseURL: env.API_URL });
  try {
    const products = await api.get('/products');
    if (!products.ok()) throw new Error(`API ${env.API_URL}/products returned ${products.status()}`);
    const body = (await products.json()) as { data?: unknown[] };
    if (!Array.isArray(body.data) || body.data.length === 0) {
      throw new Error('Catalog is empty: run `docker compose exec laravel-api php artisan migrate:fresh --seed` in the app folder.');
    }
    const ui = await api.get(env.BASE_URL);
    if (!ui.ok()) throw new Error(`UI ${env.BASE_URL} returned ${ui.status()}`);
  } catch (error) {
    throw new Error(`Local Toolshop is not ready. Start it per README.md.\n${String(error)}`);
  } finally {
    await api.dispose();
  }
}
