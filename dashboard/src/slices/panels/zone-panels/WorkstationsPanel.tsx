'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

export default function WorkstationsPanel() {
  const agents = useStore(useAgentStore, (s) => s.activeAgents);
  const sessions = useStore(useAgentStore, (s) => s.sessions);
  const recentEvents = useStore(useAgentStore, (s) => s.recentEvents);

  let totalEvents = 0;
  for (const events of recentEvents.values()) {
    totalEvents += events.length;
  }

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F4BB;" name="Agent Roster & Sessions" description="Active agents and session overview" />
      <MetricGrid>
        <Metric label="Agents" value={agents.length} />
        <Metric label="Sessions" value={sessions.size} />
        <Metric label="Events" value={totalEvents} />
      </MetricGrid>
      <ListSection title="Active Agents">
        {agents.length === 0 ? (
          <ListItem label="No agents connected" />
        ) : (
          agents.map((agent) => {
            const statusColor = agent.status === 'active' ? '#22c55e'
              : agent.status === 'failed' ? '#ef4444'
              : agent.status === 'waiting' ? '#f59e0b'
              : '#60a5fa';
            return (
              <ListItem
                key={agent.session_id}
                label={agent.name || 'Agent'}
                value={agent.currentTool ?? agent.status ?? 'idle'}
                dotColor={statusColor}
              />
            );
          })
        )}
      </ListSection>
      <ListSection title="Active Sessions">
        {sessions.size === 0 ? (
          <ListItem label="No active sessions" />
        ) : (
          Array.from(sessions.values()).map((session) => (
            <ListItem
              key={session.session_id}
              label={session.project_dir.split('/').pop() ?? session.session_id}
              value={session.session_id.slice(0, 8)}
            />
          ))
        )}
      </ListSection>
      <OpenFullViewButton />
    </div>
  );
}
