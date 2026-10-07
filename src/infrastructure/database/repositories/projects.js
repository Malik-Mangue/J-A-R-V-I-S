/**
 * Project repository.
 */
import { rowToProject, toJson } from './mappers.js';

/** @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db */
export function createProjectRepository(db) {
  return {
    /** @param {import('../../../domain/projects/project.js').Project} project */
    async insert(project) {
      await db.query(
        `insert into projects
           (id, user_id, name, objective, description, status, progress, deadline,
            next_action, provenance, created_at, updated_at, last_activity_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)`,
        [
          project.id, project.userId, project.name, project.objective, project.description,
          project.status, project.progress, project.deadline, project.nextAction,
          toJson(project.provenance), project.createdAt, project.updatedAt, project.lastActivityAt,
        ],
      );
      return project;
    },

    /** @param {string} id */
    async findById(id) {
      const { rows } = await db.query('select * from projects where id = $1', [id]);
      return rows[0] ? rowToProject(rows[0]) : null;
    },

    /** @param {import('../../../domain/projects/project.js').Project} project */
    async update(project) {
      await db.query(
        `update projects set
           name = $2, objective = $3, description = $4, status = $5, progress = $6,
           deadline = $7, next_action = $8, provenance = $9::jsonb,
           updated_at = $10, last_activity_at = $11
         where id = $1`,
        [
          project.id, project.name, project.objective, project.description, project.status,
          project.progress, project.deadline, project.nextAction, toJson(project.provenance),
          project.updatedAt, project.lastActivityAt,
        ],
      );
      return project;
    },

    /** @param {string} userId */
    async listByUser(userId) {
      const { rows } = await db.query(
        'select * from projects where user_id = $1 order by updated_at desc',
        [userId],
      );
      return rows.map(rowToProject);
    },

    /**
     * Context tool: find projects relevant to a statement
     * (docs/TOOL-CONTRACT.md `search_projects`).
     * @param {string} userId @param {string} query
     */
    async searchByName(userId, query) {
      const { rows } = await db.query(
        `select * from projects
          where user_id = $1 and name ilike '%' || $2 || '%'
          order by updated_at desc limit 10`,
        [userId, query],
      );
      return rows.map(rowToProject);
    },
  };
}
