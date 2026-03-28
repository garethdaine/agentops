'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

export default function WarRoomPanel() {
  const agents = useStore(useAgentStore, (s) => s.activeAgents);

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const idleCount = agents.filter((a) => a.status === 'idle' || !a.currentTool).length;
  const failedCount = agents.filter((a) => a.status === 'failed').length;

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F3AF;" name="Active Runs & Operations" description="Build phases and task status" />
      <MetricGrid>
        <Metric label="Active" value={activeCount} />
        <Metric label="Idle" value={idleCount} />
        <Metric label="Failed" value={failedCount} />
      </MetricGrid>
      <ListSection title="Agent Activity">
        {agents.length === 0 ? (
          <ListItem label="No agents connected" />
        ) : (
          agents.map((agent) => (
            <ListItem
              key={agent.session_id}
              label={agent.name || 'Agent'}
              value={agent.currentTool ?? 'idle'}
              dotColor={agent.status === 'active' ? '#22c55e' : agent.status === 'failed' ? '#ef4444' : '#60a5fa'}
            />
          ))
        )}
      </ListSection>
    </div>
  );
}
