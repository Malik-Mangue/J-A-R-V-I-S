/**
 * Deterministic, offline AI interpretation provider.
 *
 * This is a REAL interpretation engine (Portuguese heuristics + the
 * deterministic temporal parser), not a test double. It is the default provider
 * so that the capture pipeline works without any external service or API key,
 * and it is cheap, private and reproducible. The OpenAI-compatible provider can
 * be selected with AI_PROVIDER=openai without changing any other layer.
 *
 * It follows the same contract as any other provider: it returns a structured
 * INTERPRETATION / QUESTION response and never invents ids
 * (docs/AI-CONTRACT.md #10).
 */
import { normalizeText, parseTemporal } from '../../shared/dates/index.js';
import { parseAmountToMinor } from '../../domain/finance/money.js';
import { INTENTS, RESPONSE_TYPES } from '../../domain/shared/constants.js';
import { questionResponse } from './provider.js';

const ACTION_VERBS = [
  'terminar', 'acabar', 'falar', 'ligar', 'enviar', 'mandar', 'fazer', 'marcar',
  'tratar', 'resolver', 'preparar', 'revisar', 'corrigir', 'entregar', 'comprar',
  'pagar', 'estudar', 'escrever', 'criar', 'planear', 'planejar', 'organizar',
  'confirmar', 'contactar', 'avisar', 'ver', 'ir', 'levantar', 'reservar',
];

const IDEA_MARKERS = [
  'seria interessante', 'seria bom', 'seria fixe', 'seria otimo', 'que tal',
  'talvez um dia', 'um dia gostaria', 'e se', 'podia ser', 'tenho uma ideia',
  'ideia', 'conceito',
];

const PROJECT_MARKERS = [
  'vou criar um projeto', 'quero criar um projeto', 'criar um projeto',
  'novo projeto', 'vou desenvolver um projeto', 'projeto para', 'projeto de',
  'projeto chamado',
];

const EXPENSE_MARKERS = ['gastei', 'paguei', 'comprei', 'despesa', 'gasto', 'paguei por'];
const INCOME_MARKERS = ['recebi', 'ganhei', 'salario', 'receita', 'entrou', 'vendi'];

/**
 * @returns {{ name: string, interpret: (input: object) => Promise<object> }}
 */
export function createRuleBasedAiProvider() {
  return {
    name: 'rule',
    async interpret(input) {
      return interpretText(input);
    },
  };
}

/**
 * @param {{ text: string, context: object }} input
 * @returns {object}
 */
export function interpretText(input) {
  const text = String(input.text ?? '').trim();
  const context = input.context ?? {};
  const normalized = normalizeText(text);

  if (!text) {
    return questionResponse('INSUFFICIENT_CONTEXT', ['O que gostarias de registar?']);
  }

  const temporal = parseTemporal(text, {
    now: context.currentDate ? new Date(`${context.currentDate}T12:00:00Z`) : new Date(),
    timezone: context.timezone ?? 'UTC',
  });

  const detection = detectIntent(normalized);
  const title = cleanTitle(text);

  const entities = {
    title,
    description: null,
    deadline: temporal.deadline,
    period: temporal.period,
    time: temporal.time,
    priority: null,
    projectId: null,
  };

  const missingInformation = [];
  const uncertainties = [];
  const ambiguities = [];
  const questions = [];

  // --- Project resolution / ambiguity (never guess, docs/ARCHITECTURE.md #14)
  const projects = Array.isArray(context.relevantProjects) ? context.relevantProjects : [];
  const projectReference = resolveProjectReference(normalized, projects);
  if (projectReference.resolvedId) {
    entities.projectId = projectReference.resolvedId;
  } else if (projectReference.ambiguous) {
    ambiguities.push({ field: 'projectId', candidates: projects.map((p) => p.id) });
    questions.push('A qual projeto se refere?');
  }

  if (detection.intent === INTENTS.CREATE_EXPENSE || detection.intent === INTENTS.CREATE_INCOME) {
    const amount = extractAmount(text);
    if (amount) {
      entities.amountMinor = amount.minor;
      entities.currency = amount.currency;
      if (!amount.currency) {
        // docs/SYSTEM-PROMPT.md: "If the currency is unknown and it matters, ask."
        missingInformation.push({ field: 'currency', reason: 'A moeda não foi indicada.' });
        questions.push('Em que moeda foi o valor?');
      }
    } else {
      missingInformation.push({ field: 'amount', reason: 'Não foi possível identificar o valor.' });
      questions.push('Qual foi o valor?');
    }
    entities.category = guessCategory(normalized, detection.intent);
    if (entities.category === 'OUTROS') {
      // Surfaced as a warning in the proposal (buildProposalPayload maps
      // uncertainties to warnings) instead of silently accepting OUTROS.
      uncertainties.push({ field: 'category', reason: 'A categoria não foi identificada e ficou como OUTROS.' });
    }
    entities.description = title;
  }

  if (detection.intent === INTENTS.CREATE_TASK) {
    if (!temporal.deadline && !temporal.period) {
      missingInformation.push({
        field: 'deadline',
        reason: 'Uma tarefa precisa de uma data concreta ou de um período.',
      });
      questions.push('Quando pretendes realizar esta tarefa? Podes indicar uma data ou um período.');
    }
  }

  if (temporal.vague) {
    uncertainties.push({ field: 'deadline', reason: 'A expressão temporal usada é vaga.' });
  }
  if (detection.confidence < 0.6) {
    uncertainties.push({ field: 'intent', reason: 'A intenção não é totalmente clara.' });
  }

  return {
    type: RESPONSE_TYPES.INTERPRETATION,
    intent: detection.intent,
    confidence: detection.confidence,
    entities,
    missingInformation,
    ambiguities,
    uncertainties,
    questions: questions.map((q, index) => ({ id: `q${index + 1}`, text: q })),
    expressions: temporal.expressions,
  };
}

/**
 * @param {string} normalized lowercase, accent-free text
 * @returns {{ intent: string, confidence: number }}
 */
function detectIntent(normalized) {
  const n = normalized;
  if (/\b(projeto|projecto)\b/.test(n) && matchesAny(n, PROJECT_MARKERS)) {
    return { intent: INTENTS.CREATE_PROJECT, confidence: 0.82 };
  }
  if (matchesAny(n, EXPENSE_MARKERS)) {
    return { intent: INTENTS.CREATE_EXPENSE, confidence: 0.8 };
  }
  if (matchesAny(n, INCOME_MARKERS)) {
    return { intent: INTENTS.CREATE_INCOME, confidence: 0.78 };
  }
  if (matchesAny(n, IDEA_MARKERS)) {
    return { intent: INTENTS.CREATE_IDEA, confidence: 0.74 };
  }
  if (/\b(preciso|tenho de|tenho que|devo|quero|vou|lembrar)\b/.test(n) || matchesAny(n, ACTION_VERBS)) {
    return { intent: INTENTS.CREATE_TASK, confidence: 0.72 };
  }
  return { intent: INTENTS.CAPTURE_NOTE, confidence: 0.5 };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesAny(normalized, markers) {
  return markers.some((marker) => new RegExp(`\\b${escapeRegex(marker)}\\b`).test(normalized));
}

const TEMPORAL_STRIP = [
  /\bdepois de amanh[ãa]\b/gi,
  /\b(hoje|amanh[ãa]|ontem)\b/gi,
  /\b(esta|nesta|pr[óo]xima|proxima|[úu]ltima)\s+semana\b/gi,
  /\bsemana\s+(que\s+vem|passada)\b/gi,
  /\b(este|neste|pr[óo]ximo|proximo)\s+m[êe]s\b/gi,
  /\bm[êe]s\s+que\s+vem\b/gi,
  /\b(fim|final)\s+do\s+m[êe]s\b/gi,
  /\b(primeira|segunda)\s+metade\s+do\s+m[êe]s\b/gi,
  /\b(no|neste|este)?\s*fim\s+de\s+semana\b/gi,
  /\b(domingo|segunda-feira|segunda|ter[çc]a-feira|ter[çc]a|quarta-feira|quarta|quinta-feira|quinta|sexta-feira|sexta|s[áa]bado)\b/gi,
  /\bdaqui\s+a\s+\w+\s+(dias?|semanas?|meses?|m[êe]s)\b/gi,
  /\b(dentro\s+de|em)\s+\w+\s+(dias?|semanas?|meses?)\b/gi,
  /\bdia\s+\d{1,2}\b/gi,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
  /\b(às|as)\s+\d{1,2}(:\d{2}|h\d{2})?\b/gi,
];

const LEADING_MARKERS = /^(ol[áa][,!\s]+|ei[,\s]+|ok[,\s]+|okay[,\s]+|por favor[,\s]+|preciso de[,\s]+|preciso[,\s]+|tenho de[,\s]+|tenho que[,\s]+|tenho[,\s]+|devo[,\s]+|vou[,\s]+|quero[,\s]+|[ée] preciso[,\s]+|n[ãa]o (me )?esquecer de[,\s]+|lembra-me de[,\s]+|recorda-me de[,\s]+|criar um projeto para[,\s]+|quero criar um projeto[,\s]+|novo projeto[,\s:]+|tenho uma ideia[,\s:]+|gastei|paguei|recebi|comprei)/i;

/**
 * Build a concise title from the raw user text without inventing content.
 * @param {string} raw
 */
export function cleanTitle(raw) {
  let text = String(raw).trim();

  for (const pattern of TEMPORAL_STRIP) {
    text = text.replace(pattern, ' ');
  }

  text = text.replace(/\s+/g, ' ');

  // Remove leading intent markers and any dangling temporal connectors left
  // behind once the temporal expression itself was stripped.
  let previous;
  do {
    previous = text;
    text = text
      .replace(LEADING_MARKERS, ' ')
      .replace(/\s*\b(at[ée]|para|no|na|em|sobre|ate)\s*[,.!?;:]?\s*$/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[\s,;:.-]+$/g, '');
  } while (text !== previous);

  text = text.replace(/^[\s,;:.-]+/, '').trim();

  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const CURRENCY_ALIASES = [
  { pattern: /\b(mzn|mt|meticais?)\b/i, currency: 'MZN' },
  { pattern: /\b(eur|euros?)\b/i, currency: 'EUR' },
  { pattern: /\b(usd|d[óo]lares?)\b/i, currency: 'USD' },
  { pattern: /\b(brl|reais)\b/i, currency: 'BRL' },
];

/**
 * Extract a monetary value from free text. Returns null when no value is found
 * (never invents a value - docs/MASTER-PROMPT.md #12).
 *
 * The currency is only returned when the user actually said it; otherwise it is
 * null and the application asks (docs/SYSTEM-PROMPT.md "Finance").
 * @param {string} rawText
 * @returns {{ minor: number, currency: string|null, raw: string }|null}
 */
export function extractAmount(rawText) {
  // Remove date-like tokens first so "12/10" is not read as an amount.
  const withoutDates = String(rawText)
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ')
    .replace(/\bdia\s+\d{1,2}\b/gi, ' ');

  const match = /(\d+(?:[.,]\d{1,2})?)\s*(mzn|mt|meticais?|kz|eur|euros?|usd|d[óo]lares?|brl|reais)?/i.exec(withoutDates);
  if (!match) return null;
  try {
    const minor = parseAmountToMinor(match[1]);
    const currency = CURRENCY_ALIASES.find((alias) => alias.pattern.test(match[2] ?? ''))?.currency ?? null;
    return { minor, currency, raw: match[0].trim() };
  } catch {
    return null;
  }
}

const CATEGORY_KEYWORDS = [
  { category: 'TRANSPORTE', keywords: ['chapa', 'taxi', 'transporte', 'machimbombo', 'combustivel', 'gasolina', 'bus'] },
  { category: 'ALIMENTACAO', keywords: ['almoco', 'jantar', 'comida', 'mercado', 'supermercado', 'restaurante', 'cafe'] },
  { category: 'HABITACAO', keywords: ['renda', 'arrendamento', 'casa', 'luz', 'agua', 'electricidade'] },
  { category: 'SAUDE', keywords: ['farmacia', 'medico', 'hospital', 'clinica', 'remedio', 'consulta'] },
  { category: 'EDUCACAO', keywords: ['escola', 'universidade', 'propina', 'curso', 'livro', 'matricula'] },
  { category: 'TECNOLOGIA', keywords: ['internet', 'telefone', 'computador', 'software', 'dados', 'recarga', 'dominio'] },
  { category: 'SALARIO', keywords: ['salario', 'ordenado', 'vencimento', 'pagamento'] },
];

/**
 * @param {string} normalized
 * @param {string} intent
 */
function guessCategory(normalized, intent) {
  if (intent === INTENTS.CREATE_INCOME) {
    return 'SALARIO';
  }
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => new RegExp(`\\b${keyword}\\b`).test(normalized))) {
      return category;
    }
  }
  return 'OUTROS';
}

/**
 * Resolve the referenced project, or report ambiguity. The system must never
 * arbitrarily pick one project when several are plausible
 * (docs/ARCHITECTURE.md #14).
 *
 * @param {string} normalized
 * @param {Array<{id: string, name: string}>} projects
 * @returns {{ resolvedId?: string, ambiguous?: boolean }}
 */
function resolveProjectReference(normalized, projects) {
  if (!projects || projects.length === 0) return { resolvedId: undefined };

  const byName = projects.find((project) => normalized.includes(normalizeText(project.name)));
  if (byName) return { resolvedId: byName.id };

  const referencesProject = /\b(aquele|esse|este|o)\s+(projeto|projecto)\b|\bprojeto\b/.test(normalized);
  if (!referencesProject) return { resolvedId: undefined };

  if (projects.length === 1) return { resolvedId: projects[0].id };
  return { ambiguous: true };
}


