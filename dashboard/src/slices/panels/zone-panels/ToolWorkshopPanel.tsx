'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

const TOOL_NAMES = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'];

export default function ToolWorkshopPanel() {
  const recentEvents = useStore(useAgentStore, (s) => s.recentEvents);

  const toolCounts: Record<string, number> = {};
  for (const name of TOOL_NAMES) {
    toolCounts[name] = 0;
  }

  for (const events of recentEvents.values()) {
    for (const event of events) {
      const tool = (event as Record<string, unknown>).tool as string | undefined;
      if (tool && tool in toolCounts) {
        toolCounts[tool]++;
      }
    }
  }

  const totalCalls = Object.values(toolCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F6E0;" name="Tool Usage" description="Tool call counts and recent activity" />
      <MetricGrid>
        <Metric label="Total Calls" value={totalCalls} />
        <Metric label="Tools" value={TOOL_NAMES.length} />
        <Metric label="Active" value={Object.values(toolCounts).filter((c) => c > 0).length} />
      </MetricGrid>
      <ListSection title="Tool Breakdown">
        {TOOL_NAMES.map((name) => (
          <ListItem
            key={name}
            label={name}
            value={String(toolCounts[name])}
            dotColor={toolCounts[name] > 0 ? '#22c55e' : '#6b7280'}
          />
        ))}
      </ListSection>
    </div>
  );
}
