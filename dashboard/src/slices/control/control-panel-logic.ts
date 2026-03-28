import type { AgentStatus } from '@/types/agent';
import type { CommandType } from './control-protocol';

/** Actions available in the control panel. */
export type ControlAction = CommandType;

/** State snapshot for an in-flight optimistic update. */
export interface OptimisticState {
  optimisticStatus: AgentStatus;
  previousStatus: AgentStatus;
  commandId: string;
  action: ControlAction;
}

/** Map of agent status to the control actions available in that status. */
const STATUS_ACTION_MAP: Record<AgentStatus, ControlAction[]> = {
  active: ['pause', 'cancel'],
  waiting: ['resume', 'cancel'],
  idle: ['resume'],
  error: ['cancel'],
  disconnected: [],
};

/** Map of control action to the expected resulting agent status. */
const OPTIMISTIC_STATUS_MAP: Record<ControlAction, AgentStatus> = {
  pause: 'waiting',
  resume: 'active',
  cancel: 'disconnected',
};

/** Derive which control actions are available for an agent given its status and pending actions. */
export function deriveAvailableActions(
  status: AgentStatus,
  pendingActions: ControlAction[],
): ControlAction[] {
  const base = STATUS_ACTION_MAP[status] ?? [];
  return base.filter((action) => !pendingActions.includes(action));
}

/** Compute the optimistic status update for a given action. */
export function applyOptimisticUpdate(
  currentStatus: AgentStatus,
  action: ControlAction,
): Omit<OptimisticState, 'commandId' | 'action'> {
  return {
    optimisticStatus: OPTIMISTIC_STATUS_MAP[action],
    previousStatus: currentStatus,
  };
}

/** Restore the previous status from an optimistic state. */
export function rollbackOptimisticUpdate(state: OptimisticState): AgentStatus {
  return state.previousStatus;
}
