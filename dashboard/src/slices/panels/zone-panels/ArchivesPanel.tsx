'use client';

import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

interface CortexData {
  totalMemories: number;
  types: { semantic: number; episodic: number; procedural: number; tool: number };
  recentSessions: { title: string; date: string }[];
  available: boolean;
}

function parseCortexContext(text: string): CortexData {
  const data: CortexData = {
    totalMemories: 0,
    types: { semantic: 0, episodic: 0, procedural: 0, tool: 0 },
    recentSessions: [],
    available: true,
  };

  // Parse total memories count: "**14 memories** across 3 types"
  const totalMatch = text.match(/\*\*(\d+)\s+memories\*\*/);
  if (totalMatch) data.totalMemories = parseInt(totalMatch[1], 10);

  // Parse type counts: "5 semantic (facts/knowledge), 8 episodic..."
  const typeMatch = text.match(/(\d+)\s+semantic.*?(\d+)\s+episodic.*?(\d+)\s+procedural/);
  if (typeMatch) {
    data.types.semantic = parseInt(typeMatch[1], 10);
    data.types.episodic = parseInt(typeMatch[2], 10);
    data.types.procedural = parseInt(typeMatch[3], 10);
  }

  // Parse tool count if present
  const toolMatch = text.match(/(\d+)\s+tool/);
  if (toolMatch) data.types.tool = parseInt(toolMatch[1], 10);

  // Parse recent sessions from "## Recent Sessions" section
  const sessionsSection = text.match(/## Recent Sessions\s*([\s\S]*?)(?=\n##|\n\*\*|$)/);
  if (sessionsSection) {
    const sessionLines = sessionsSection[1].match(/- \*\*(\d{4}-\d{2}-\d{2})\*\*:\s*(.+?)(?:\s*\u2014|$)/gm);
    if (sessionLines) {
      for (const line of sessionLines.slice(0, 5)) {
        const match = line.match(/- \*\*(\d{4}-\d{2}-\d{2})\*\*:\s*(.+?)(?:\s*\u2014|$)/);
        if (match) {
          data.recentSessions.push({ date: match[1], title: match[2].trim() });
        }
      }
    }
  }

  return data;
}

export default function ArchivesPanel() {
  const recentEvents = useStore(useAgentStore, (s) => s.recentEvents);
  const sessions = useStore(useAgentStore, (s) => s.sessions);

  const [cortex, setCortex] = useState<CortexData | null>(null);

  useEffect(() => {
    // Try to load Cortex data via API route
    fetch('/api/cortex')
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.text();
      })
      .then((text) => setCortex(parseCortexContext(text)))
      .catch(() => setCortex({ totalMemories: 0, types: { semantic: 0, episodic: 0, procedural: 0, tool: 0 }, recentSessions: [], available: false }));
  }, []);

  let totalEvents = 0;
  for (const events of recentEvents.values()) {
    totalEvents += events.length;
  }

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F4DA;" name="Archives & Memory" description="Cortex memory store and session recordings" />
      <MetricGrid>
        <Metric label="Memories" value={cortex?.available ? cortex.totalMemories : '--'} />
        <Metric label="Recordings" value={sessions.size} />
        <Metric label="Events" value={totalEvents} />
      </MetricGrid>

      {cortex?.available && cortex.totalMemories > 0 && (
        <ListSection title="Memory Types">
          <ListItem label="Semantic (facts)" value={String(cortex.types.semantic)} dotColor="#818cf8" />
          <ListItem label="Episodic (sessions)" value={String(cortex.types.episodic)} dotColor="#22c55e" />
          <ListItem label="Procedural (patterns)" value={String(cortex.types.procedural)} dotColor="#f59e0b" />
          <ListItem label="Tool (discoveries)" value={String(cortex.types.tool)} dotColor="#60a5fa" />
        </ListSection>
      )}

      {cortex?.available && cortex.recentSessions.length > 0 && (
        <ListSection title="Recent Cortex Sessions">
          {cortex.recentSessions.map((s, i) => (
            <ListItem key={i} label={s.title} value={s.date} />
          ))}
        </ListSection>
      )}

      <ListSection title="Live Sessions">
        {sessions.size === 0 ? (
          <ListItem label="No recordings available" />
        ) : (
          Array.from(sessions.values()).map((session) => (
            <ListItem
              key={session.session_id}
              label={session.project_dir.split('/').pop() ?? 'Session'}
              value={new Date(session.started_at).toLocaleTimeString()}
            />
          ))
        )}
      </ListSection>
    </div>
  );
}
