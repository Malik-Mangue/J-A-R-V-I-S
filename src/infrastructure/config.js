import './env.js';

function readEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

export const config = {
  database: {
    /** When set, a real PostgreSQL server is used; otherwise embedded PGlite. */
    url: readEnv('DATABASE_URL', null),
    pgliteDataDir: readEnv('PGLITE_DATA_DIR', './.data/pgdata'),
  },
  app: {
    defaultUserId: readEnv('DEFAULT_USER_ID', 'user_local'),
    timezone: readEnv('APP_TIMEZONE', 'Africa/Maputo'),
    locale: readEnv('APP_LOCALE', 'pt-MZ'),
    /**
     * User configuration, not a hard-coded assumption. When it is not set the
     * system ASKS for the currency instead of assuming one
     * (docs/SYSTEM-PROMPT.md "Finance").
     */
    defaultCurrency: readEnv('DEFAULT_CURRENCY', null),
  },
  ai: {
    provider: readEnv('AI_PROVIDER', 'rule'),
    model: readEnv('AI_MODEL', 'gpt-4o-mini'),
    apiKey: readEnv('OPENAI_API_KEY', null),
    baseUrl: readEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
  },
  transcription: {
    provider: readEnv('TRANSCRIPTION_PROVIDER', 'none'),
    model: readEnv('TRANSCRIPTION_MODEL', 'whisper-1'),
    apiKey: readEnv('OPENAI_API_KEY', null),
    baseUrl: readEnv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
  },
  obsidian: {
    vaultPath: readEnv('OBSIDIAN_VAULT_PATH', null),
  },
};

export default config;
