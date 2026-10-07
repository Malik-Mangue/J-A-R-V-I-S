/**
 * Capture repository. Only provenance metadata is stored; the original audio is
 * never persisted (docs/ARCHITECTURE.md #10).
 */
import { rowToCapture, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createCaptureRepository(db) {
  return {
    /** @param {import('../../../domain/capture/capture.js').Capture} capture */
    async insert(capture) {
      await db.query(
        `insert into captures
           (id, user_id, type, source, text_content, original_filename, mime_type,
            duration_ms, size_bytes, hash, metadata, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
        [
          capture.id, capture.userId, capture.type, capture.source, capture.text,
          capture.originalFilename, capture.mimeType, capture.durationMs,
          capture.sizeBytes, capture.hash, toJson(capture.metadata), capture.createdAt,
        ],
      );
      return capture;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from captures where id = $1', [id]);
      return rows[0] ? rowToCapture(rows[0]) : null;
    },

    /**
     * Most recent voice capture with this content hash. Used to recognise a
     * repeated upload of the very same recording (docs: the original audio is
     * never stored, only its hash - so identical bytes are detectable).
     * @param {string} userId @param {string} hash
     */
    async findLatestVoiceByHash(userId, hash) {
      if (!hash) return null;
      const { rows } = await db.query(
        `select * from captures
          where user_id = $1 and type = 'VOICE' and hash = $2
          order by created_at desc limit 1`,
        [userId, hash],
      );
      return rows[0] ? rowToCapture(rows[0]) : null;
    },

    /** @param {string} userId @param {number} [limit] */
    async listRecent(userId, limit = 20) {
      const { rows } = await db.query(
        'select * from captures where user_id = $1 order by created_at desc limit $2',
        [userId, limit],
      );
      return rows.map(rowToCapture);
    },
  };
}
