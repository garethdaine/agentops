import { describe, it, expect } from 'vitest';
import {
  deriveAvailableActions,
  applyOptimisticUpdate,
  rollbackOptimisticUpdate,
  type ControlAction,
  type OptimisticState,
} from '../control-panel-logic';
import type { AgentStatus } from '@/types/agent';

describe('Control Panel Logic', () => {
  describe('deriveAvailableActions', () => {
    it('should offer pause and cancel for active agent', () => {
      const actions = deriveAvailableActions('active', []);
      expect(actions).toContain('pause');
      expect(actions).toContain('cancel');
      expect(actions).not.toContain('resume');
    });

    it('should offer resume and cancel for waiting agent', () => {
      const actions = deriveAvailableActions('waiting', []);
      expect(actions).toContain('resume');
      expect(actions).toContain('cancel');
      expect(actions).not.toContain('pause');
    });

    it('should offer resume for idle agent', () => {
      const actions = deriveAvailableActions('idle', []);
      expect(actions).toContain('resume');
    });

    it('should offer no actions for disconnected agent', () => {
      const actions = deriveAvailableActions('disconnected', []);
      expect(actions).toHaveLength(0);
    });

    it('should disable actions that have pending commands', () => {
      const actions = deriveAvailableActions('active', ['pause']);
      expect(actions).not.toContain('pause');
      expect(actions).toContain('cancel');
    });
  });

  describe('applyOptimisticUpdate', () => {
    it('should set agent status to waiting on pause command', () => {
      const result = applyOptimisticUpdate('active', 'pause');
      expect(result.optimisticStatus).toBe('waiting');
      expect(result.previousStatus).toBe('active');
    });

    it('should set agent status to active on resume command', () => {
      const result = applyOptimisticUpdate('waiting', 'resume');
      expect(result.optimisticStatus).toBe('active');
      expect(result.previousStatus).toBe('waiting');
    });

    it('should set agent status to disconnected on cancel command', () => {
      const result = applyOptimisticUpdate('active', 'cancel');
      expect(result.optimisticStatus).toBe('disconnected');
      expect(result.previousStatus).toBe('active');
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    it('should restore previous status on rollback', () => {
      const optimistic: OptimisticState = {
        optimisticStatus: 'waiting',
        previousStatus: 'active',
        commandId: 'cmd-123',
        action: 'pause',
      };
      const restored = rollbackOptimisticUpdate(optimistic);
      expect(restored).toBe('active');
    });
  });
});
