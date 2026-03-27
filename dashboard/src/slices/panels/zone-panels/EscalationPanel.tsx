'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

export default function EscalationPanel() {
  const agents = useStore(useAgentStore, (s) => s.activeAgents);
  const recentEvents = useStore(useAgentStore, (s) => s.recentEvents);

  const failedAgents = agents.filter((a) => a.status === 'failed');

  let errorCount = 0;
  for (const events of recentEvents.values()) {
    for (const event of events) {
      const e = event as Record<string, unknown>;
      if (e.event === 'error' || e.status === 'failure') {
        errorCount++;
      }
    }
  }

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F6A8;" name="Incidents & Errors" description="Error tracking and escalation" />
      <MetricGrid>
        <Metric label="Errors" value={errorCount} />
        <Metric label="Failed" value={failedAgents.length} />
        <Metric label="Incidents" value={0} />
      </MetricGrid>
      <ListSection title="Recent Errors">
        {failedAgents.length === 0 && errorCount === 0 ? (
          <ListItem label="No errors or incidents" dotColor="#22c55e" />
        ) : (
          failedAgents.map((agent) => (
            <ListItem
              key={agent.session_id}
              label={`${agent.name || 'Agent'} - Failed`}
              value={agent.currentTool ?? 'unknown'}
              dotColor="#ef4444"
            />
          ))
        )}
      </ListSection>
      <OpenFullViewButton />
    </div>
  );
}
