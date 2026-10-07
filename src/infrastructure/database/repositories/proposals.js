/**
 * Proposal repository.
 */
import { rowToProposal, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createProposalRepository(db) {
  return {
    /** @param {import('../../../domain/proposal/proposal.js').Proposal} proposal */
    async insert(proposal) {
      await db.query(
        `insert into proposals
           (id, user_id, capture_id, interpretation_id, intent, payload, changes, warnings,
            status, created_at, resolved_at, result_entity_id, result_entity_type, cancellation_reason)
         values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14)`,
        [
          proposal.id, proposal.userId, proposal.captureId, proposal.interpretationId,
          proposal.intent, toJson(proposal.payload), toJson(proposal.changes),
          toJson(proposal.warnings), proposal.status, proposal.createdAt,
          proposal.resolvedAt, proposal.resultEntityId, proposal.resultEntityType,
          proposal.cancellationReason,
        ],
      );
      return proposal;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from proposals where id = $1', [id]);
      return rows[0] ? rowToProposal(rows[0]) : null;
    },

    /** @param {import('../../../domain/proposal/proposal.js').Proposal} proposal */
    async update(proposal) {
      await db.query(
        `update proposals set
           payload = $2::jsonb, changes = $3::jsonb, warnings = $4::jsonb, status = $5,
           resolved_at = $6, result_entity_id = $7, result_entity_type = $8, cancellation_reason = $9
         where id = $1`,
        [
          proposal.id, toJson(proposal.payload), toJson(proposal.changes),
          toJson(proposal.warnings), proposal.status, proposal.resolvedAt,
          proposal.resultEntityId, proposal.resultEntityType, proposal.cancellationReason,
        ],
      );
      return proposal;
    },

    /** @param {string} captureId */
    async listPendingByCapture(captureId) {
      const { rows } = await db.query(
        `select * from proposals where capture_id = $1 and status = 'PENDING' order by created_at desc`,
        [captureId],
      );
      return rows.map(rowToProposal);
    },

    /** @param {string} userId */
    async listPendingByUser(userId) {
      const { rows } = await db.query(
        `select * from proposals where user_id = $1 and status = 'PENDING' order by created_at desc limit 20`,
        [userId],
      );
      return rows.map(rowToProposal);
    },
  };
}
