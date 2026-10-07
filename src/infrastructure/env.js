/**
 * Minimal `.env` loader.
 *
 * Next.js loads `.env*` automatically for the web app, but our scripts (migrate)
 * and tests run in plain Node. This loader makes them behave the same way,
 * without adding a dependency. Existing environment variables always win.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = ['.env.local', '.env'];

let loaded = false;

export function loadEnvFiles({ cwd = process.cwd() } = {}) {
  if (loaded) return;
  loaded = true;
  for (const file of FILES) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();
