import type { StateCreator } from 'zustand';
import type { Command as ProtocolCommand, CommandAck } from './control-protocol';

/** A command queued for execution. */
export interface Command {
  id: string;
  type: 'pause' | 'cancel' | 'resume';
  target: string;
  timestamp: string;
}

/** A pending command awaiting acknowledgement. */
export interface PendingCommand {
  command: ProtocolCommand;
  sentAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'error' | 'timeout';
}

/** Control slice state and actions. */
export interface ControlSliceState {
  commandQueue: Command[];
  pendingCommands: Map<string, PendingCommand>;
  enqueueCommand: (command: Command) => void;
  dequeueCommand: () => void;
  trackCommand: (cmd: ProtocolCommand) => void;
  resolveCommand: (ack: CommandAck) => void;
  timeoutCommand: (commandId: string) => void;
}

/** Creates the control slice with command queue management. */
export const createControlSlice: StateCreator<ControlSliceState, [], [], ControlSliceState> = (set, get) => ({
  commandQueue: [],
  pendingCommands: new Map(),

  enqueueCommand: (command: Command) => {
    set({ commandQueue: [...get().commandQueue, command] });
  },

  dequeueCommand: () => {
    set({ commandQueue: get().commandQueue.slice(1) });
  },

  trackCommand: (cmd: ProtocolCommand) => {
    const next = new Map(get().pendingCommands);
    next.set(cmd.id, { command: cmd, sentAt: new Date().toISOString(), status: 'pending' });
    set({ pendingCommands: next });
  },

  resolveCommand: (ack: CommandAck) => {
    const next = new Map(get().pendingCommands);
    const entry = next.get(ack.id);
    if (!entry) return;
    next.set(ack.id, { ...entry, status: ack.status });
    set({ pendingCommands: next });
  },

  timeoutCommand: (commandId: string) => {
    const next = new Map(get().pendingCommands);
    const entry = next.get(commandId);
    if (!entry) return;
    next.set(commandId, { ...entry, status: 'timeout' });
    set({ pendingCommands: next });
  },
});
