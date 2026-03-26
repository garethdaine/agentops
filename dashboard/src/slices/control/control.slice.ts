import type { StateCreator } from 'zustand';

/** A command queued for execution. */
export interface Command {
  id: string;
  type: 'pause' | 'cancel' | 'resume';
  target: string;
  timestamp: string;
}

/** Control slice state and actions. */
export interface ControlSliceState {
  commandQueue: Command[];
  enqueueCommand: (command: Command) => void;
  dequeueCommand: () => void;
}

/** Creates the control slice with command queue management. */
export const createControlSlice: StateCreator<ControlSliceState, [], [], ControlSliceState> = (set, get) => ({
  commandQueue: [],

  enqueueCommand: (command: Command) => {
    set({ commandQueue: [...get().commandQueue, command] });
  },

  dequeueCommand: () => {
    set({ commandQueue: get().commandQueue.slice(1) });
  },
});
