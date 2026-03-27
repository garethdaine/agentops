'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

export default function BreakRoomPanel() {
  const agents = useStore(useAgentStore, (s) => s.activeAgents);

  const idleAgents = agents.filter((a) => !a.currentTool && a.status !== 'active');
  const totalCount = agents.length;

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x2615;" name="Idle Agents" description="Agents currently not working on tasks" />
      <MetricGrid>
        <Metric label="Total" value={totalCount} />
        <Metric label="Idle" value={idleAgents.length} />
        <Metric label="Active" value={totalCount - idleAgents.length} />
      </MetricGrid>
      <ListSection title="Idle Agents">
        {idleAgents.length === 0 ? (
          <ListItem label="All agents are busy" />
        ) : (
          idleAgents.map((agent) => (
            <ListItem
              key={agent.session_id}
              label={agent.name || 'Agent'}
              value="Idle"
              dotColor="#60a5fa"
            />
          ))
        )}
      </ListSection>
      <OpenFullViewButton />
    </div>
  );
}
