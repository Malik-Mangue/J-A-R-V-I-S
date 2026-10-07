/**
 * Interpretation repository.
 */
import { rowToInterpretation, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createInterpretationRepository(db) {
  return {
    /** @param {import('../../../domain/interpretation/interpretation.js').Interpretation} interpretation */
    async insert(interpretation) {
      await db.query(
        `insert into interpretations
           (id, user_id, capture_id, transcription_id, intent, confidence, entities,
            missing_information, ambiguities, uncertainties, questions, created_at)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12)`,
        [
          interpretation.id, interpretation.userId, interpretation.captureId,
          interpretation.transcriptionId, interpretation.intent, interpretation.confidence,
          toJson(interpretation.entities), toJson(interpretation.missingInformation),
          toJson(interpretation.ambiguities), toJson(interpretation.uncertainties),
          toJson(interpretation.questions), interpretation.createdAt,
        ],
      );
      return interpretation;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from interpretations where id = $1', [id]);
      return rows[0] ? rowToInterpretation(rows[0]) : null;
    },

    /** @param {string} captureId */
    async findByCaptureId(captureId) {
      const { rows } = await db.query(
        'select * from interpretations where capture_id = $1 order by created_at desc limit 1',
        [captureId],
      );
      return rows[0] ? rowToInterpretation(rows[0]) : null;
    },
  };
}
