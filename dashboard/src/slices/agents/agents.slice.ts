import type { StateCreator } from 'zustand';
import type { Position3D } from '@/types/office';
import type { AgentVisualState } from '@/types/office-store';

export type { AgentVisualState } from '@/types/office-store';

/** Agents slice state and actions. */
export interface AgentsSliceState {
  agentPositions: Map<string, Position3D>;
  agentStates: Map<string, AgentVisualState>;
  setAgentPosition: (agentId: string, position: Position3D) => void;
  setAgentState: (agentId: string, state: AgentVisualState) => void;
}

/** Creates the agents slice with position and visual state tracking. */
export const createAgentsSlice: StateCreator<AgentsSliceState, [], [], AgentsSliceState> = (set, get) => ({
  agentPositions: new Map<string, Position3D>(),
  agentStates: new Map<string, AgentVisualState>(),

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
});
