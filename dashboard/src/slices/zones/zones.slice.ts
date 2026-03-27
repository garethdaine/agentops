import type { StateCreator } from 'zustand';
import type { Zone } from '@/types/office';
import {
  calculateWorkstationSlots,
  expandWorkstationGrid,
  type WorkstationSlot,
} from '@/lib/dynamic-workstations';

/** Zones slice state and actions. */
export interface ZonesSliceState {
  zoneDefinitions: Zone[];
  zoneOccupancy: Map<string, string[]>;
  workstationSlots: WorkstationSlot[];
  setZoneOccupancy: (zoneId: string, agentIds: string[]) => void;
  updateWorkstationCapacity: (agentCount: number) => void;
}

/** Default zone definitions for the office layout. */
const DEFAULT_ZONES: Zone[] = [
  { id: 'serverRack', name: 'Server Rack', position: { x: -10, y: 0, z: -8 }, size: { width: 4, depth: 4 } },
  { id: 'warRoom', name: 'War Room', position: { x: -6, y: 0, z: -8 }, size: { width: 4, depth: 4 } },
  { id: 'securityDesk', name: 'Security Desk', position: { x: 10, y: 0, z: -8 }, size: { width: 4, depth: 4 } },
  { id: 'workstations', name: 'Workstations', position: { x: 0, y: 0, z: 0 }, size: { width: 10, depth: 8 } },
  { id: 'mailroom', name: 'Mailroom', position: { x: -10, y: 0, z: 4 }, size: { width: 4, depth: 4 } },
  { id: 'conference', name: 'Conference', position: { x: 10, y: 0, z: 0 }, size: { width: 5, depth: 4 } },
  { id: 'vault', name: 'Vault', position: { x: -10, y: 0, z: 0 }, size: { width: 4, depth: 4 } },
  { id: 'toolWorkshop', name: 'Tool Workshop', position: { x: 6, y: 0, z: 4 }, size: { width: 4, depth: 4 } },
  { id: 'breakRoom', name: 'Break Room', position: { x: 10, y: 0, z: 8 }, size: { width: 4, depth: 4 } },
  { id: 'escalation', name: 'Escalation', position: { x: -6, y: 0, z: 8 }, size: { width: 4, depth: 4 } },
];

/** Base workstation grid (9 slots). */
const BASE_WORKSTATION_SLOTS = expandWorkstationGrid(9);

/** Creates the zones slice with zone definitions and occupancy tracking. */
export const createZonesSlice: StateCreator<ZonesSliceState, [], [], ZonesSliceState> = (set, get) => ({
  zoneDefinitions: DEFAULT_ZONES,
  zoneOccupancy: new Map<string, string[]>(),
  workstationSlots: BASE_WORKSTATION_SLOTS,

  setZoneOccupancy: (zoneId: string, agentIds: string[]) => {
    const newOccupancy = new Map(get().zoneOccupancy);
    newOccupancy.set(zoneId, agentIds);
    set({ zoneOccupancy: newOccupancy });
  },

  updateWorkstationCapacity: (agentCount: number) => {
    const needed = calculateWorkstationSlots(agentCount);
    const current = get().workstationSlots.length;
    if (needed !== current) {
      set({ workstationSlots: expandWorkstationGrid(needed) });
    }
  },
});
