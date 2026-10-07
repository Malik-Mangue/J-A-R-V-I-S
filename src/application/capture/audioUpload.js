/**
 * Audio upload rules (used by POST /api/capture/audio).
 *
 * Kept as pure functions so the rules are unit-testable without HTTP and the
 * route handler stays a thin adapter (docs/ARCHITECTURE.md #30).
 *
 * Honesty rules:
 *  - the file must exist, be non-empty and within the size limit;
 *  - the MIME type must be a supported one. Browsers that report an empty or
 *    wrong type (iOS Safari can send nothing or `video/mp4`) fall back to the
 *    filename extension; when neither is usable the upload is rejected instead
 *    of being guessed;
 *  - duration and language are provenance metadata: an unusable value becomes
 *    `null` (unknown) - it is never invented.
 */

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB
/** Guard against absurd metadata; a 3-minute cap is enforced by the recorder UI. */
export const MAX_AUDIO_DURATION_MS = 60 * 60 * 1000; // 6 hours

export const ALLOWED_AUDIO_MIME_TYPES = Object.freeze([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
]);

const ALLOWED = new Set(ALLOWED_AUDIO_MIME_TYPES);

/** Extension -> MIME type, used when the browser does not declare one. */
const EXTENSION_MIME_TYPES = Object.freeze({
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  mov: 'audio/mp4',
  wav: 'audio/wav',
  wave: 'audio/wav',
  aac: 'audio/aac',
});

const DEFAULT_EXTENSIONS = Object.freeze({
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/aac': 'aac',
});

/**
 * Resolve the MIME type of an uploaded recording.
 * @param {unknown} declaredType what the browser reported (`file.type`)
 * @param {string} filename
 * @returns {string|null} a supported MIME type, or null when unusable
 */
export function inferAudioMimeType(declaredType, filename) {
  const declared = String(declaredType ?? '').split(';')[0].trim().toLowerCase();
  if (ALLOWED.has(declared)) return declared;

  const name = String(filename ?? '');
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const inferred = EXTENSION_MIME_TYPES[extension] ?? null;
  if (inferred && ALLOWED.has(inferred)) return inferred;

  return null;
}

/**
 * Duration is optional metadata. Unknown, negative or absurd values become
 * `null` (unknown) instead of being fabricated.
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizeDurationMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_AUDIO_DURATION_MS) return null;
  return Math.round(parsed);
}

/**
 * Language hint for the transcription provider (BCP-47-ish). Anything else is
 * dropped rather than guessed.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeLanguage(value) {
  const raw = String(value ?? '').trim();
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(raw)) return raw;
  return null;
}

/**
 * Validate one audio upload.
 *
 * @param {object} input
 * @param {unknown} input.file      the uploaded file (or a File-shaped object)
 * @param {unknown} [input.durationMs]
 * @param {unknown} [input.language]
 * @returns {{ ok: true, filename: string, mimeType: string, sizeBytes: number, durationMs: number|null, language: string|null }
 *         | { ok: false, status: number, message: string }}
 */
export function parseAudioUpload({ file, durationMs, language }) {
  if (!file || typeof file !== 'object' || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function') {
    return { ok: false, status: 400, message: 'Nenhum áudio recebido.' };
  }
  if (file.size === 0) {
    return { ok: false, status: 400, message: 'Nenhum áudio recebido.' };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, status: 413, message: 'O áudio excede o tamanho máximo permitido.' };
  }

  const mimeType = inferAudioMimeType(file.type, file.name);
  if (!mimeType) {
    const described = String(file.type ?? '').trim() || String(file.name ?? '').trim() || 'desconhecido';
    return { ok: false, status: 415, message: `Formato de áudio não suportado: ${described}` };
  }

  const name = String(file.name ?? '').trim();
  const filename = name || `audio.${DEFAULT_EXTENSIONS[mimeType] ?? 'webm'}`;

  return {
    ok: true,
    filename,
    mimeType,
    sizeBytes: file.size,
    durationMs: normalizeDurationMs(durationMs),
    language: normalizeLanguage(language),
  };
}
