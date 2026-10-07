/**
 * Migration runner.
 *
 * Applies the SQL files in /migrations in lexical order, each inside its own
 * transaction, and records them in `schema_migrations`. Works identically on
 * a real PostgreSQL server and on the embedded PGlite engine.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logger } from '../logging/logger.js';
import { DEFAULT_AUTOMATION } from '../../domain/shared/constants.js';

/**
 * Resolved at runtime (not via import.meta.url) so the bundler does not try to
 * trace the migrations directory as a module.
 */
const DEFAULT_MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || resolve(process.cwd(), 'migrations');

/**
 * @param {import('./client.js').Database} db
 * @param {{ migrationsDir?: string }} [options]
 * @returns {Promise<string[]>} applied versions
 */
export async function runMigrations(db, options = {}) {
  const dir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
  await db.exec(
    'create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())',
  );

  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedResult = await db.query('select version from schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => row.version));

  const newlyApplied = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(resolve(dir, file), 'utf8');
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('insert into schema_migrations (version) values ($1)', [file]);
    });
    newlyApplied.push(file);
    logger.info('migration.applied', { version: file });
  }
  return newlyApplied;
}

/**
 * Seed the single local user and the conservative default automation policy.
 * Automation is OFF by default (docs/MASTER-PROMPT.md #13).
 *
 * @param {import('./client.js').Database} db
 * @param {{ userId: string, timezone?: string, locale?: string }} input
 */
export async function ensureSeedData(db, input) {
  const timezone = input.timezone ?? 'Africa/Maputo';
  const locale = input.locale ?? 'pt-MZ';
  await db.query(
    `insert into users (id, display_name, timezone, locale)
     values ($1, $2, $3, $4)
     on conflict (id) do nothing`,
    [input.userId, 'Utilizador', timezone, locale],
  );
  await db.query(
    `insert into automation_settings (user_id, settings)
     values ($1, $2::jsonb)
     on conflict (user_id) do nothing`,
    [input.userId, JSON.stringify(DEFAULT_AUTOMATION)],
  );
}

export { DEFAULT_MIGRATIONS_DIR };
