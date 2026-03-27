'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

export default function ServerRoomPanel() {
  const connectionStatus = useStore(useAgentStore, (s) => s.connectionStatus);
  const sessions = useStore(useAgentStore, (s) => s.sessions);
  const agents = useStore(useAgentStore, (s) => s.activeAgents);

  const relayConnected = connectionStatus === 'connected';
  const sessionCount = sessions.size;
  const agentCount = agents.length;

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F5A5;" name="System Infrastructure" description="Relay status, sessions, and connectivity" />
      <MetricGrid>
        <Metric label="Relay" value={relayConnected ? 'Online' : 'Offline'} />
        <Metric label="Sessions" value={sessionCount} />
        <Metric label="Agents" value={agentCount} />
      </MetricGrid>
      <ListSection title="Status">
        <ListItem
          label="WebSocket Relay"
          value={relayConnected ? 'Connected' : 'Disconnected'}
          dotColor={relayConnected ? '#22c55e' : '#ef4444'}
        />
        <ListItem label="Active Sessions" value={String(sessionCount)} />
        <ListItem label="WebSocket Clients" value={String(agentCount)} />
      </ListSection>
      <OpenFullViewButton />
    </div>
  );
}
