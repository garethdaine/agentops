import * as fs from 'fs/promises';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface SessionEntry {
  session_id: string;
  project_dir: string;
  started_at: string;
  pid: number;
  last_event_at?: string;
  stale: boolean;
}

interface RawSessionEntry {
  session_id: string;
  project_dir: string;
  started_at: string;
  pid: number;
  last_event_at?: string;
}

function isValidRawEntry(obj: unknown): obj is RawSessionEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.session_id === 'string' &&
    typeof o.project_dir === 'string' &&
    typeof o.started_at === 'string' &&
    typeof o.pid === 'number'
  );
}

function isStale(entry: RawSessionEntry): boolean {
  const lastActivity = entry.last_event_at ?? entry.started_at;
  const elapsed = Date.now() - new Date(lastActivity).getTime();
  return elapsed > STALE_THRESHOLD_MS;
}

/**
 * Reads and parses the active sessions registry file.
 * Returns an empty array if the file does not exist.
 * Skips malformed lines gracefully.
 */
export async function readSessionRegistry(
  registryPath: string,
): Promise<SessionEntry[]> {
  let content: string;
  try {
    content = await fs.readFile(registryPath, 'utf-8');
  } catch {
    return [];
  }

  const entries: SessionEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isValidRawEntry(parsed)) {
        entries.push({
          session_id: parsed.session_id,
          project_dir: parsed.project_dir,
          started_at: parsed.started_at,
          pid: parsed.pid,
          last_event_at: parsed.last_event_at,
          stale: isStale(parsed),
        });
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  return entries;
}

/**
 * Returns deduplicated list of project directories from active (non-stale) sessions.
 */
export async function getActiveProjectDirs(
  registryPath: string,
): Promise<string[]> {
  const entries = await readSessionRegistry(registryPath);
  const activeDirs = new Set<string>();

  for (const entry of entries) {
    if (!entry.stale) {
      activeDirs.add(entry.project_dir);
    }
  }

  return [...activeDirs];
}
