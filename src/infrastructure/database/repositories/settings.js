/**
 * Automation settings repository.
 *
 * Automation is OFF by default and is always explicit and user-controlled
 * (docs/MASTER-PROMPT.md #13).
 */
import { DEFAULT_AUTOMATION } from '../../../domain/shared/constants.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createSettingsRepository(db) {
  return {
    /** @param {string} userId @returns {Promise<Record<string, boolean>>} */
    async getAutomation(userId) {
      const { rows } = await db.query('select settings from automation_settings where user_id = $1', [userId]);
      if (!rows[0]) return { ...DEFAULT_AUTOMATION };
      const stored = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
      return { ...DEFAULT_AUTOMATION, ...(stored ?? {}) };
    },

    /** @param {string} userId @param {Record<string, boolean>} patch */
    async setAutomation(userId, patch) {
      const current = await this.getAutomation(userId);
      const next = { ...current, ...patch };
      await db.query(
        `insert into automation_settings (user_id, settings, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (user_id) do update set settings = $2::jsonb, updated_at = now()`,
        [userId, JSON.stringify(next)],
      );
      return next;
    },
  };
}
