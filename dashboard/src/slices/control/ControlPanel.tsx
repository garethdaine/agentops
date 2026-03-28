'use client';

import React, { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { AgentStatus } from '@/types/agent';
import {
  deriveAvailableActions,
  applyOptimisticUpdate,
  type ControlAction,
  type OptimisticState,
} from './control-panel-logic';
import { createCommand, type CommandAck } from './control-protocol';
import { sendCommand, onCommandAck } from '@/hooks/useWebSocket';

/** Map a control action to the appropriate button variant. */
function resolveButtonVariant(action: ControlAction): 'default' | 'destructive' | 'outline' {
  if (action === 'cancel') return 'destructive';
  if (action === 'resume') return 'default';
  return 'outline';
}

/** Map a control action to a human-readable label. */
function resolveButtonLabel(action: ControlAction, isPending: boolean): string {
  if (isPending) return `${action.charAt(0).toUpperCase() + action.slice(1)}ing...`;
  return action.charAt(0).toUpperCase() + action.slice(1);
}

interface ControlPanelProps {
  agentStatus: AgentStatus;
  sessionId: string;
  onOptimisticUpdate?: (state: OptimisticState) => void;
  onRollback?: (state: OptimisticState) => void;
  onAckReceived?: (ack: CommandAck) => void;
}

export default function ControlPanel({
  agentStatus,
  sessionId,
  onOptimisticUpdate,
  onRollback,
  onAckReceived,
}: ControlPanelProps) {
  const pendingRef = useRef<Map<string, OptimisticState>>(new Map());
  const pendingActionsRef = useRef<ControlAction[]>([]);

  const [pendingActions, setPendingActions] = React.useState<ControlAction[]>([]);

  const handleAck = useCallback(
    (ack: CommandAck) => {
      const optimistic = pendingRef.current.get(ack.id);
      if (!optimistic) return;

      pendingRef.current.delete(ack.id);
      pendingActionsRef.current = pendingActionsRef.current.filter(
        (a) => a !== optimistic.action,
      );
      setPendingActions([...pendingActionsRef.current]);

      if (ack.status === 'rejected' || ack.status === 'error') {
        onRollback?.(optimistic);
      }
      onAckReceived?.(ack);
    },
    [onRollback, onAckReceived],
  );

  React.useEffect(() => {
    onCommandAck(handleAck);
  }, [handleAck]);

  const handleAction = useCallback(
    (action: ControlAction) => {
      const cmd = createCommand(action, sessionId);
      const update = applyOptimisticUpdate(agentStatus, action);

      const optimistic: OptimisticState = {
        ...update,
        commandId: cmd.id,
        action,
      };

      pendingRef.current.set(cmd.id, optimistic);
      pendingActionsRef.current = [...pendingActionsRef.current, action];
      setPendingActions([...pendingActionsRef.current]);

      onOptimisticUpdate?.(optimistic);

      const sent = sendCommand(cmd);
      if (!sent) {
        pendingRef.current.delete(cmd.id);
        pendingActionsRef.current = pendingActionsRef.current.filter(
          (a) => a !== action,
        );
        setPendingActions([...pendingActionsRef.current]);
        onRollback?.(optimistic);
      }
    },
    [agentStatus, sessionId, onOptimisticUpdate, onRollback],
  );

  const availableActions = deriveAvailableActions(agentStatus, pendingActions);

  return (
    <div className="flex gap-2 px-2 pt-3" data-testid="control-panel">
      {(['pause', 'resume', 'cancel'] as const).map((action) => {
        const isAvailable = availableActions.includes(action);
        const isPending = pendingActions.includes(action);
        const isVisible = isAvailable || isPending;

        if (!isVisible) return null;

        return (
          <Button
            key={action}
            variant={resolveButtonVariant(action)}
            size="sm"
            disabled={isPending || !isAvailable}
            onClick={() => handleAction(action)}
            data-testid={`control-${action}`}
          >
            {resolveButtonLabel(action, isPending)}
          </Button>
        );
      })}
    </div>
  );
}
