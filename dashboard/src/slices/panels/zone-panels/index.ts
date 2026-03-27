export { default as ServerRoomPanel } from './ServerRoomPanel';
export { default as WarRoomPanel } from './WarRoomPanel';
export { default as SecurityPanel } from './SecurityPanel';
export { default as WorkstationsPanel } from './WorkstationsPanel';
export { default as ConferenceRoomPanel } from './ConferenceRoomPanel';
export { default as ArchivesPanel } from './ArchivesPanel';
export { default as BreakRoomPanel } from './BreakRoomPanel';
export { default as ToolWorkshopPanel } from './ToolWorkshopPanel';
export { default as CommsHubPanel } from './CommsHubPanel';
export { default as EscalationPanel } from './EscalationPanel';

export { ZonePanelHeader, MetricGrid, Metric, ListSection, ListItem, OpenFullViewButton } from './ZonePanelLayout';

import type { ComponentType } from 'react';
import ServerRoomPanel from './ServerRoomPanel';
import WarRoomPanel from './WarRoomPanel';
import SecurityPanel from './SecurityPanel';
import WorkstationsPanel from './WorkstationsPanel';
import ConferenceRoomPanel from './ConferenceRoomPanel';
import ArchivesPanel from './ArchivesPanel';
import BreakRoomPanel from './BreakRoomPanel';
import ToolWorkshopPanel from './ToolWorkshopPanel';
import CommsHubPanel from './CommsHubPanel';
import EscalationPanel from './EscalationPanel';

/** Map zone IDs to their rich panel components. */
export const ZONE_PANEL_MAP: Record<string, ComponentType> = {
  serverRack: ServerRoomPanel,
  warRoom: WarRoomPanel,
  securityDesk: SecurityPanel,
  workstations: WorkstationsPanel,
  conference: ConferenceRoomPanel,
  vault: ArchivesPanel,
  breakRoom: BreakRoomPanel,
  toolWorkshop: ToolWorkshopPanel,
  mailroom: CommsHubPanel,
  escalation: EscalationPanel,
};
