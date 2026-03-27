'use client';

import { useMemo } from 'react';
import {
  parseBuildExecution,
  deriveBuildState,
  type BuildState,
} from '@/lib/build-lifecycle';

interface BuildPhaseIndicatorProps {
  /** Raw JSONL content from .agentops/build-execution.jsonl */
  rawJSONL: string;
}

/** Compact panel showing the current build phase, progress bar, and wave breakdown. */
export default function BuildPhaseIndicator({ rawJSONL }: BuildPhaseIndicatorProps) {
  const state: BuildState = useMemo(() => {
    const entries = parseBuildExecution(rawJSONL);
    return deriveBuildState(entries);
  }, [rawJSONL]);

  if (!state.currentPhase) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-500">
        No active build phase
      </div>
    );
  }

  const { currentPhase, activeWaves } = state;
  const progress =
    currentPhase.tasksStarted > 0
      ? (currentPhase.tasksCompleted / currentPhase.tasksStarted) * 100
      : 0;

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-900 p-3 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-zinc-200">{currentPhase.name}</span>
        <span className="text-zinc-400">Wave {currentPhase.wave}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-zinc-400">
        {currentPhase.tasksCompleted}/{currentPhase.tasksStarted} tasks complete
      </div>

      {/* Wave breakdown */}
      {activeWaves.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {activeWaves.map(w => (
            <div key={w.waveId} className="flex justify-between text-zinc-500">
              <span>Wave {w.waveId}</span>
              <span>
                {w.completedTasks}/{w.startedTasks}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
