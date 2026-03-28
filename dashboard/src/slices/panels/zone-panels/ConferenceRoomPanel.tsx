'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

export default function ConferenceRoomPanel() {
  const agents = useStore(useAgentStore, (s) => s.activeAgents);

  const workingAgents = agents.filter((a) => a.status === 'active');

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F4CB;" name="Delegation & Task Orchestration" description="Task delegation and coordination" />
      <MetricGrid>
        <Metric label="Delegations" value={0} />
        <Metric label="Running" value={workingAgents.length} />
        <Metric label="Verifying" value={0} />
      </MetricGrid>
      <ListSection title="Active Tasks">
        {workingAgents.length === 0 ? (
          <ListItem label="No active delegations" />
        ) : (
          workingAgents.map((agent) => (
            <ListItem
              key={agent.session_id}
              label={agent.name || 'Agent'}
              value={agent.currentTool ?? 'working'}
              dotColor="#22c55e"
            />
          ))
        )}
      </ListSection>
    </div>
  );
}
