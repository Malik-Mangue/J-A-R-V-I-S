/**
 * Repository composition root.
 *
 * Repositories receive a database handle (or a transaction) and expose domain
 * shaped data. The application layer depends on these, never on raw SQL.
 */
import { createCaptureRepository } from './captures.js';
import { createTranscriptionRepository } from './transcriptions.js';
import { createInterpretationRepository } from './interpretations.js';
import { createProposalRepository } from './proposals.js';
import { createTaskRepository } from './tasks.js';
import { createProjectRepository } from './projects.js';
import { createIdeaRepository } from './ideas.js';
import { createInboxRepository } from './inbox.js';
import { createFinanceRepository } from './finance.js';
import { createEventRepository } from './events.js';
import { createSettingsRepository } from './settings.js';

/**
 * @param {import('../client.js').Database | import('../client.js').DatabaseTransaction} db
 */
export function createRepositories(db) {
  return {
    captures: createCaptureRepository(db),
    transcriptions: createTranscriptionRepository(db),
    interpretations: createInterpretationRepository(db),
    proposals: createProposalRepository(db),
    tasks: createTaskRepository(db),
    projects: createProjectRepository(db),
    ideas: createIdeaRepository(db),
    inbox: createInboxRepository(db),
    finance: createFinanceRepository(db),
    events: createEventRepository(db),
    settings: createSettingsRepository(db),
  };
}
