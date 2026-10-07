/**
 * Use case: GetDashboard
 *
 * The homepage must answer quickly "what is happening and what deserves my
 * attention?" (docs/ARCHITECTURE.md #16). This service composes a view model so
 * the React component does not become an aggregator of business rules
 * (docs/ARCHITECTURE.md #42).
 *
 * Attention items are produced by DETERMINISTIC rules (overdue tasks, stalled
 * projects). Every suggestion carries its evidence, and nothing is executed
 * automatically (docs/ARCHITECTURE.md #22).
 */
import {
  compareIsoDates,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  toIsoDate,
  toLocalDateParts,
} from '../../shared/dates/index.js';
import { isOverdue } from '../../domain/tasks/task.js';
import { TASK_STATUS } from '../../domain/shared/constants.js';
import { detectSuggestions } from '../suggestions/detectSuggestions.js';

/**
 * @param {import('../container.js').Container} container
 */
export async function getDashboard(container) {
  const today = toIsoDate(toLocalDateParts(container.clock(), container.timezone));
  const weekStart = toIsoDate(startOfWeek(toLocalDateParts(container.clock(), container.timezone)));
  const weekEnd = toIsoDate(endOfWeek(toLocalDateParts(container.clock(), container.timezone)));

  const [allTasks, projects, inbox, ideas, pendingProposals, financeSummary, financeByCategory] = await Promise.all([
    container.repositories.tasks.listByUser(container.userId),
    container.repositories.projects.listByUser(container.userId),
    container.repositories.inbox.listByUser(container.userId),
    container.repositories.ideas.listByUser(container.userId),
    container.repositories.proposals.listPendingByUser(container.userId),
    container.repositories.finance.summary(container.userId, monthRange(today)),
    container.repositories.finance.byCategory(container.userId, monthRange(today)),
  ]);

  const open = allTasks.filter((task) =>
    [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED].includes(task.status),
  );

  const effectiveDate = (task) => task.deadline ?? task.period?.end ?? null;
  const overdue = open.filter((task) => isOverdue(task, today));
  const dueToday = open.filter((task) => effectiveDate(task) === today && !isOverdue(task, today));
  const thisWeek = open.filter((task) => {
    const date = effectiveDate(task);
    return date !== null && compareIsoDates(date, weekStart) >= 0 && compareIsoDates(date, weekEnd) <= 0;
  });

  const attention = [...overdue, ...dueToday];
  const suggestions = detectSuggestions({ tasks: allTasks, projects, today });

  return {
    generatedAt: container.clock().toISOString(),
    today,
    week: { start: weekStart, end: weekEnd },
    todayView: {
      tasks: dueToday,
      overdue,
      commitments: [],
      priorities: attention.slice(0, 10),
    },
    weekView: {
      tasks: thisWeek,
      projects: projects.filter((project) => ['ACTIVE', 'PLANNED'].includes(project.status)),
      goals: [],
      deadlines: thisWeek,
    },
    inbox,
    projects,
    finance: { month: monthRange(today), summary: financeSummary, byCategory: financeByCategory },
    ideas: ideas.slice(0, 10),
    pendingProposals,
    suggestions,
    counts: {
      openTasks: open.length,
      overdueTasks: overdue.length,
      activeProjects: projects.filter((project) => project.status === 'ACTIVE').length,
      openInboxItems: inbox.length,
      ideas: ideas.length,
    },
  };
}

/** Current calendar month range, used for the financial overview. */
function monthRange(todayIso) {
  const { year, month, day } = fromIsoParts(todayIso);
  const parts = { year, month, day };
  return { from: toIsoDate(startOfMonth(parts)), to: toIsoDate(endOfMonth(parts)) };
}

function fromIsoParts(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}
