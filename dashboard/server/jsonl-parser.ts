/**
 * Error-tolerant JSONL parser.
 * Parses individual lines, skipping malformed JSON without throwing.
 */

export interface ParsedLine<T = Record<string, unknown>> {
  ok: true;
  data: T;
  line: string;
}

export interface FailedLine {
  ok: false;
  error: string;
  line: string;
}

export type ParseResult<T = Record<string, unknown>> = ParsedLine<T> | FailedLine;

/**
 * Parse a single JSON line. Returns a discriminated union so callers
 * can decide what to do with failures.
 */
export function parseLine<T = Record<string, unknown>>(line: string): ParseResult<T> {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'empty line', line };
  }
  try {
    const data = JSON.parse(trimmed) as T;
    return { ok: true, data, line: trimmed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      line: trimmed,
    };
  }
}

/**
 * Parse a chunk of text containing multiple JSONL lines.
 * Returns only successfully parsed records by default.
 */
export function parseChunk<T = Record<string, unknown>>(chunk: string): T[] {
  const lines = chunk.split('\n');
  const results: T[] = [];
  for (const line of lines) {
    const result = parseLine<T>(line);
    if (result.ok) {
      results.push(result.data);
    }
  }
  return results;
}
