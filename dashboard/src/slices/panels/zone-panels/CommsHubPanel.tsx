'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

export default function CommsHubPanel() {
  const connectionStatus = useStore(useAgentStore, (s) => s.connectionStatus);
  const agents = useStore(useAgentStore, (s) => s.activeAgents);

  const connected = connectionStatus === 'connected';

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F4E1;" name="WebSocket Relay" description="Connection status and throughput" />
      <MetricGrid>
        <Metric label="Status" value={connected ? 'Online' : 'Offline'} />
        <Metric label="Clients" value={agents.length} />
        <Metric label="Msg/sec" value="--" />
      </MetricGrid>
      <ListSection title="Connection Details">
        <ListItem
          label="WebSocket Status"
          value={connected ? 'Connected' : 'Disconnected'}
          dotColor={connected ? '#22c55e' : '#ef4444'}
        />
        <ListItem label="Connected Clients" value={String(agents.length)} />
        <ListItem label="Protocol" value="ws://localhost:3001" />
      </ListSection>
    </div>
  );
}
