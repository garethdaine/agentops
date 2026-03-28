'use client';

import { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem } from './ZonePanelLayout';

export default function SecurityPanel() {
  return (
    <div className="space-y-4 py-4">
      <ZonePanelHeader icon="&#x1F6E1;" name="Runtime Security" description="Enforcement mode and feature flags" />
      <MetricGrid>
        <Metric label="Mode" value="Advisory" />
        <Metric label="Flags" value={0} />
        <Metric label="Firewall" value="Active" />
      </MetricGrid>
      <ListSection title="Security Controls">
        <ListItem label="Enforcement Mode" value="Advisory" dotColor="#f59e0b" />
        <ListItem label="Unicode Firewall" value="Enabled" dotColor="#22c55e" />
        <ListItem label="Protected Paths" value="Active" dotColor="#22c55e" />
        <ListItem label="Hook Validation" value="Enabled" dotColor="#22c55e" />
      </ListSection>
    </div>
  );
}
