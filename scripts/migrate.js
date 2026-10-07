#!/usr/bin/env node
/**
 * CLI: apply migrations and seed the local user.
 *
 *   npm run migrate
 *
 * Uses the embedded PostgreSQL engine unless DATABASE_URL is set.
 */
import { createDatabase } from '../src/infrastructure/database/client.js';
import { ensureSeedData, runMigrations } from '../src/infrastructure/database/migrate.js';
import { config } from '../src/infrastructure/config.js';
import { logger } from '../src/infrastructure/logging/logger.js';

async function main() {
  const db = await createDatabase();
  logger.info('database.connected', { kind: db.kind });
  try {
    const applied = await runMigrations(db);
    await ensureSeedData(db, {
      userId: config.app.defaultUserId,
      timezone: config.app.timezone,
      locale: config.app.locale,
    });
    logger.info('migrations.done', { applied: applied.length });
    process.stdout.write(
      applied.length > 0
        ? `Aplicadas ${applied.length} migração(ões): ${applied.join(', ')}\n`
        : 'Base de dados já estava atualizada.\n',
    );
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  logger.error('migrations.failed', { message: error.message });
  process.stderr.write(`Falha ao migrar: ${error.message}\n`);
  process.exitCode = 1;
});
