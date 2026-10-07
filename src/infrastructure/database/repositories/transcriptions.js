/**
 * Transcription repository (kept separate from captures and interpretations).
 */
import { rowToTranscription } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createTranscriptionRepository(db) {
  return {
    /** @param {import('../../../domain/capture/transcription.js').Transcription} transcription */
    async insert(transcription) {
      await db.query(
        `insert into transcriptions
           (id, capture_id, text_content, language, provider, confidence, duration_ms, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          transcription.id, transcription.captureId, transcription.text,
          transcription.language, transcription.provider, transcription.confidence,
          transcription.durationMs, transcription.createdAt,
        ],
      );
      return transcription;
    },

    /** @param {string} captureId */
    async findByCaptureId(captureId) {
      const { rows } = await db.query(
        'select * from transcriptions where capture_id = $1 order by created_at desc limit 1',
        [captureId],
      );
      return rows[0] ? rowToTranscription(rows[0]) : null;
    },
  };
}
