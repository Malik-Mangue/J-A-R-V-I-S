/**
 * Database access layer.
 *
 * PostgreSQL is the source of truth (docs/ARCHITECTURE.md #24). Two drivers are
 * supported behind one tiny interface:
 *
 *   - `postgres` : a real PostgreSQL server, via the `pg` driver and DATABASE_URL
 *   - `pglite`   : an embedded PostgreSQL engine (WASM) persisting to disk,
 *                  used when no server is configured. It is the same Postgres
 *                  SQL engine (PostgreSQL 16), so migrations and queries are
 *                  identical and can be moved to a server without changes.
 *
 * Nothing above the infrastructure layer knows which driver is in use.
 */
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from '../config.js';

const { Pool } = pg;

/**
 * @typedef {object} DatabaseTransaction
 * @property {(sql: string, params?: unknown[]) => Promise<{ rows: object[], rowCount: number }>} query
 * @property {(sql: string) => Promise<void>} exec
 */

/**
 * @typedef {object} Database
 * @property {'postgres'|'pglite'} kind
 * @property {(sql: string, params?: unknown[]) => Promise<{ rows: object[], rowCount: number }>} query
 * @property {(sql: string) => Promise<void>} exec
 * @property {<T>(fn: (tx: DatabaseTransaction) => Promise<T>) => Promise<T>} transaction
 * @property {() => Promise<void>} close
 */

/**
 * @param {{ url?: string|null, pgliteDataDir?: string }} [options]
 * @returns {Promise<Database>}
 */
export async function createDatabase(options = {}) {
  const url = options.url ?? config.database.url;
  if (url) {
    return createPostgresDatabase(url);
  }
  return createPgliteDatabase(options.pgliteDataDir ?? config.database.pgliteDataDir);
}

/** @param {string} connectionString @returns {Promise<Database>} */
async function createPostgresDatabase(connectionString) {
  const pool = new Pool({ connectionString });
  // Fail fast with a clear error instead of a confusing first query failure.
  await pool.query('select 1');
  return {
    kind: 'postgres',
    query: (sql, params) => pool.query(sql, params),
    exec: async (sql) => {
      await pool.query(sql);
    },
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = {
          query: (sql, params) => client.query(sql, params),
          exec: async (sql) => {
            await client.query(sql);
          },
        };
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

/** @param {string} dataDir @returns {Promise<Database>} */
async function createPgliteDatabase(dataDir) {
  // PGlite creates the data directory itself, but not its parents.
  const resolvedDir = resolve(dataDir);
  mkdirSync(dirname(resolvedDir), { recursive: true });
  const database = new PGlite(resolvedDir);
  await database.waitReady;
  return {
    kind: 'pglite',
    query: (sql, params) => database.query(sql, params),
    exec: (sql) => database.exec(sql),
    transaction: (fn) =>
      database.transaction((tx) =>
        fn({
          query: (sql, params) => tx.query(sql, params),
          exec: (sql) => tx.exec(sql),
        }),
      ),
    close: () => database.close(),
  };
}

const SINGLETON_KEY = Symbol.for('personal-second-brain.database');

/**
 * Process-wide database handle, reused across hot reloads in development.
 * @returns {Promise<Database>}
 */
export function getDatabase() {
  const globalStore = /** @type {Record<symbol, unknown>} */ (globalThis);
  if (!globalStore[SINGLETON_KEY]) {
    globalStore[SINGLETON_KEY] = createDatabase();
  }
  return /** @type {Promise<Database>} */ (globalStore[SINGLETON_KEY]);
}
