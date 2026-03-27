'use client';

import { useMemo } from 'react';
import { useStore } from 'zustand';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentStore } from '@/stores/agent-store';
import { useOfficeStore } from '@/stores/office-store';
import type { AgentState, SessionState } from '@/stores/agent-store';

export interface SessionOption {
  value: string;
  label: string;
}

/** Extract the basename from a directory path. */
function formatSessionLabel(session: SessionState): string {
  const basename = session.project_dir.split('/').pop() ?? session.session_id;
  return `${basename} (${session.session_id.slice(0, 8)})`;
}

/** Build dropdown options from the sessions map, prepending "All Sessions". */
export function buildSessionOptions(sessions: Map<string, SessionState>): SessionOption[] {
  const allOption: SessionOption = { value: 'all', label: 'All Sessions' };
  const sessionOptions: SessionOption[] = [];

  for (const [, session] of sessions) {
    sessionOptions.push({
      value: session.session_id,
      label: formatSessionLabel(session),
    });
  }

  return [allOption, ...sessionOptions];
}

/** Filter agents by session ID; returns all when id is "all" or null. */
export function filterAgentsBySession(
  agents: AgentState[],
  selectedSessionId: string | null,
): AgentState[] {
  if (selectedSessionId === null || selectedSessionId === 'all') {
    return agents;
  }
  return agents.filter((a) => a.session_id === selectedSessionId);
}

/** Session selector dropdown for multi-session filtering. */
export default function SessionSelector() {
  const sessions = useStore(useAgentStore, (s) => s.sessions);
  const selectedSessionId = useStore(useOfficeStore, (s) => s.selectedSessionId);
  const setSelectedSession = useStore(useOfficeStore, (s) => s.setSelectedSession);

  const options = useMemo(
    () => buildSessionOptions(sessions),
    [sessions],
  );

  return (
    <Select value={selectedSessionId} onValueChange={setSelectedSession}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Sessions" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
