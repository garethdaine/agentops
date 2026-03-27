'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

export default function ArchivesPanel() {
  const recentEvents = useStore(useAgentStore, (s) => s.recentEvents);
  const sessions = useStore(useAgentStore, (s) => s.sessions);

  let totalEvents = 0;
  for (const events of recentEvents.values()) {
    totalEvents += events.length;
  }

  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F4DA;" name="Session Recordings" description="Event archives and session history" />
      <MetricGrid>
        <Metric label="Recordings" value={sessions.size} />
        <Metric label="Events" value={totalEvents} />
        <Metric label="Size" value="--" />
      </MetricGrid>
      <ListSection title="Recent Sessions">
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
      <OpenFullViewButton />
    </div>
  );
}
