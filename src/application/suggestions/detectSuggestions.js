/**
 * Proactive intelligence detection (deterministic rules only).
 *
 * docs/ARCHITECTURE.md #22: Detection -> Suggestion -> Inbox -> User Decision.
 * A suggestion never changes the system by itself, and every suggestion carries
 * evidence (docs/SYSTEM-PROMPT.md "Every suggestion must have evidence").
 *
 * These rules live in the Application layer so the dashboard and the Inbox use
 * exactly the same detections (no duplicated business logic).
 */
import { isOverdue } from '../../domain/tasks/task.js';
import { isProjectStalled } from '../../domain/projects/project.js';
import { INBOX_TYPES, TASK_STATUS } from '../../domain/shared/constants.js';

const OPEN_STATUSES = [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED];
export const PROJECT_STALL_DAYS = 14;

/**
 * @param {{ tasks: object[], projects: object[], today: string }} input
 * @returns {object[]} deterministic suggestions
 */
export function detectSuggestions({ tasks, projects, today }) {
  const open = tasks.filter((task) => OPEN_STATUSES.includes(task.status));
  const overdue = open.filter((task) => isOverdue(task, today));
  /** @type {object[]} */
  const suggestions = [];

  if (overdue.length > 0) {
    suggestions.push({
      key: 'attention.overdue',
      inboxType: INBOX_TYPES.OVERDUE,
      category: 'OVERDUE',
      title: `${overdue.length} tarefa(s) em atraso`,
      description: overdue
        .slice(0, 5)
        .map((task) => `${task.title} (${task.deadline ?? task.period?.end})`)
        .join('; '),
      priority: 'HIGH',
      evidence: overdue.map((task) => ({ type: 'TASK', id: task.id })),
      relatedEntityId: null,
      relatedEntityType: null,
    });
  }

  for (const project of projects) {
    if (isProjectStalled(project, today, PROJECT_STALL_DAYS)) {
      suggestions.push({
        key: `project.stalled.${project.id}`,
        inboxType: INBOX_TYPES.PROJECT_STALLED,
        category: 'PROJECT_STALLED',
        title: `Projeto "${project.name}" sem atividade recente`,
        description: `Sem alterações registadas há ${PROJECT_STALL_DAYS} ou mais dias.`,
        priority: 'MEDIUM',
        evidence: [{ type: 'PROJECT', id: project.id }],
        relatedEntityId: project.id,
        relatedEntityType: 'PROJECT',
      });
    }

    if (['ACTIVE', 'PLANNED'].includes(project.status) && !project.nextAction) {
      suggestions.push({
        key: `project.no_next_action.${project.id}`,
        inboxType: INBOX_TYPES.DECISION,
        category: 'MISSING_NEXT_ACTION',
        title: `Projeto "${project.name}" sem próxima ação`,
        description: 'Não existe uma próxima ação definida para este projeto.',
        priority: 'MEDIUM',
        evidence: [{ type: 'PROJECT', id: project.id }],
        relatedEntityId: project.id,
        relatedEntityType: 'PROJECT',
      });
    }
  }

  return suggestions;
}