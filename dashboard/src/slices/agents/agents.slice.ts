import type { StateCreator } from 'zustand';
import type { Position2D, Position3D } from '@/types/office';
import type { AgentVisualState } from '@/types/office-store';
import { findPath, getZoneEntryPoint } from './pathfinding/waypoint-graph';

export type { AgentVisualState } from '@/types/office-store';

/** Agents slice state and actions. */
export interface AgentsSliceState {
  agentPositions: Map<string, Position3D>;
  agentStates: Map<string, AgentVisualState>;
  agentPaths: Map<string, Position2D[]>;
  agentTargetZones: Map<string, string>;
  setAgentPosition: (agentId: string, position: Position3D) => void;
  setAgentState: (agentId: string, state: AgentVisualState) => void;
  assignAgentToZone: (agentId: string, zoneId: string) => void;
}

/** Creates the agents slice with position and visual state tracking. */
export const createAgentsSlice: StateCreator<AgentsSliceState, [], [], AgentsSliceState> = (set, get) => ({
  agentPositions: new Map<string, Position3D>(),
  agentStates: new Map<string, AgentVisualState>(),
  agentPaths: new Map<string, Position2D[]>(),
  agentTargetZones: new Map<string, string>(),

  setAgentPosition: (agentId: string, position: Position3D) => {
    const newPositions = new Map(get().agentPositions);
    newPositions.set(agentId, position);
    set({ agentPositions: newPositions });
  },

  setAgentState: (agentId: string, state: AgentVisualState) => {
    const newStates = new Map(get().agentStates);
    newStates.set(agentId, state);
    set({ agentStates: newStates });
  },

  assignAgentToZone: (agentId: string, zoneId: string) => {
    const pos = get().agentPositions.get(agentId);
    const from: Position2D = pos ? { x: pos.x, z: pos.z } : { x: 0, z: 0 };
    const target = getZoneEntryPoint(zoneId);
    const path = findPath(from, target);

    const newPaths = new Map(get().agentPaths);
    newPaths.set(agentId, path);

    const newZones = new Map(get().agentTargetZones);
    newZones.set(agentId, zoneId);

    set({ agentPaths: newPaths, agentTargetZones: newZones });
  },
});
