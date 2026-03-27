/* ---------------------------------------------------------------
 * Build Lifecycle — JSONL parser and phase/wave extractors
 * Parses .agentops/build-execution.jsonl content into typed data
 * structures for the BuildPhaseIndicator and WarRoomScreen.
 * --------------------------------------------------------------- */

// ---- Types ----------------------------------------------------

export interface BuildExecutionEntry {
  type: 'phase_start' | 'task_start' | 'task_complete';
  phase?: string;
  task?: string;
  wave: number;
  status?: string;
  ts: string;
}

export interface BuildPhase {
  name: string;
  wave: number;
  tasksStarted: number;
  tasksCompleted: number;
}

export interface WaveProgress {
  waveId: number;
  startedTasks: number;
  completedTasks: number;
}

export interface BuildState {
  currentPhase: BuildPhase | null;
  activeWaves: WaveProgress[];
  totalEntries: number;
}

// ---- Parsing --------------------------------------------------

/** Parse a single JSONL line, returning null on failure. */
function parseJSONLLine<T>(line: string): T | null {
  try {
    return JSON.parse(line) as T;
  } catch {
    return null;
  }
}

/** Parse raw JSONL text into an array of BuildExecutionEntry. */
export function parseBuildExecution(raw: string): BuildExecutionEntry[] {
  if (!raw.trim()) return [];
  return raw
    .split('\n')
    .map(line => parseJSONLLine<BuildExecutionEntry>(line))
    .filter((entry): entry is BuildExecutionEntry => entry !== null);
}

// ---- Phase extraction -----------------------------------------

/** Return the latest phase with task progress counted from its start. */
export function extractCurrentPhase(
  entries: BuildExecutionEntry[],
): BuildPhase | null {
  let lastPhaseIndex = -1;

  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].type === 'phase_start') {
      lastPhaseIndex = i;
      break;
    }
  }

  if (lastPhaseIndex === -1) return null;

  const phaseEntry = entries[lastPhaseIndex];
  let tasksStarted = 0;
  let tasksCompleted = 0;

  for (let i = lastPhaseIndex + 1; i < entries.length; i++) {
    if (entries[i].type === 'task_start') tasksStarted++;
    if (entries[i].type === 'task_complete') tasksCompleted++;
  }

  return {
    name: phaseEntry.phase!,
    wave: phaseEntry.wave,
    tasksStarted,
    tasksCompleted,
  };
}

// ---- Wave extraction ------------------------------------------

/** Group tasks by wave and compute started/completed counts. */
export function extractActiveWaves(
  entries: BuildExecutionEntry[],
): WaveProgress[] {
  const waves = new Map<number, { started: number; completed: number }>();

  for (const entry of entries) {
    if (entry.type === 'task_start' || entry.type === 'task_complete') {
      if (!waves.has(entry.wave)) {
        waves.set(entry.wave, { started: 0, completed: 0 });
      }
      const w = waves.get(entry.wave)!;
      if (entry.type === 'task_start') w.started++;
      if (entry.type === 'task_complete') w.completed++;
    }
  }

  return Array.from(waves.entries()).map(([waveId, counts]) => ({
    waveId,
    startedTasks: counts.started,
    completedTasks: counts.completed,
  }));
}

// ---- Composite state ------------------------------------------

/** Derive full BuildState from entries (for use in selectors). */
export function deriveBuildState(
  entries: BuildExecutionEntry[],
): BuildState {
  return {
    currentPhase: extractCurrentPhase(entries),
    activeWaves: extractActiveWaves(entries),
    totalEntries: entries.length,
  };
}
