import type { StateCreator } from 'zustand';
import type { Command as ProtocolCommand, CommandAck } from './control-protocol';
import type { OptimisticState } from './control-panel-logic';
import type { AgentStatus } from '@/types/agent';

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
  optimisticStates: Map<string, OptimisticState>;
  enqueueCommand: (command: Command) => void;
  dequeueCommand: () => void;
  trackCommand: (cmd: ProtocolCommand) => void;
  resolveCommand: (ack: CommandAck) => void;
  timeoutCommand: (commandId: string) => void;
  applyOptimistic: (agentId: string, state: OptimisticState) => void;
  rollbackOptimistic: (agentId: string) => void;
}

/** Creates the control slice with command queue management. */
export const createControlSlice: StateCreator<ControlSliceState, [], [], ControlSliceState> = (set, get) => ({
  commandQueue: [],
  pendingCommands: new Map(),
  optimisticStates: new Map(),

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

  applyOptimistic: (agentId: string, state: OptimisticState) => {
    const next = new Map(get().optimisticStates);
    next.set(agentId, state);
    set({ optimisticStates: next });
  },

  rollbackOptimistic: (agentId: string) => {
    const next = new Map(get().optimisticStates);
    next.delete(agentId);
    set({ optimisticStates: next });
  },
});
