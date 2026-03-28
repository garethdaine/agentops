import { describe, it, expect } from 'vitest';
import {
  deriveServerRackLedState,
  deriveTrafficLightColor,
  deriveWhiteboardGlow,
  deriveBarrierLedState,
  deriveAlarmBellPulse,
} from '../zone-feedback';

describe('Zone Visual Feedback', () => {
  describe('deriveServerRackLedState', () => {
    it('should return pulsing green when all agents healthy', () => {
      const state = deriveServerRackLedState({
        agentStatuses: ['active', 'active', 'idle'],
        errorCount: 0,
      });
      expect(state.color).toBe('#10b981');
      expect(state.mode).toBe('pulse');
      expect(state.intensity).toBeGreaterThan(0);
      expect(state.intensity).toBeLessThanOrEqual(1);
    });

    it('should return blinking red when any agent has error status', () => {
      const state = deriveServerRackLedState({
        agentStatuses: ['active', 'error', 'idle'],
        errorCount: 1,
      });
      expect(state.color).toBe('#ef4444');
      expect(state.mode).toBe('blink');
    });

    it('should return dim amber when no agents are active', () => {
      const state = deriveServerRackLedState({
        agentStatuses: [],
        errorCount: 0,
      });
      expect(state.color).toBe('#f59e0b');
      expect(state.mode).toBe('static');
      expect(state.intensity).toBeLessThan(0.5);
    });
  });

  describe('deriveTrafficLightColor', () => {
    it('should return green when load is low (< 0.5)', () => {
      expect(deriveTrafficLightColor(0.2)).toBe('green');
    });

    it('should return amber when load is medium (0.5-0.8)', () => {
      expect(deriveTrafficLightColor(0.6)).toBe('amber');
    });

    it('should return red when load is high (> 0.8)', () => {
      expect(deriveTrafficLightColor(0.9)).toBe('red');
    });

    it('should return red when load is exactly 1.0', () => {
      expect(deriveTrafficLightColor(1.0)).toBe('red');
    });
  });

  describe('deriveWhiteboardGlow', () => {
    it('should return elevated emissive when delegation is active', () => {
      const glow = deriveWhiteboardGlow({ delegationActive: true });
      expect(glow.emissiveIntensity).toBeGreaterThan(0.3);
      expect(glow.emissiveColor).toBe('#4488ff');
    });

    it('should return baseline emissive when no delegation', () => {
      const glow = deriveWhiteboardGlow({ delegationActive: false });
      expect(glow.emissiveIntensity).toBeLessThanOrEqual(0.05);
    });
  });

  describe('deriveBarrierLedState', () => {
    it('should return green for standard runtime mode', () => {
      const state = deriveBarrierLedState('standard');
      expect(state.color).toBe('#10b981');
      expect(state.active).toBe(true);
    });

    it('should return amber for restricted runtime mode', () => {
      const state = deriveBarrierLedState('restricted');
      expect(state.color).toBe('#f59e0b');
      expect(state.active).toBe(true);
    });

    it('should return red for locked runtime mode', () => {
      const state = deriveBarrierLedState('locked');
      expect(state.color).toBe('#ef4444');
      expect(state.active).toBe(true);
    });
  });

  describe('deriveAlarmBellPulse', () => {
    it('should return active pulse when rate limited', () => {
      const pulse = deriveAlarmBellPulse({ rateLimited: true });
      expect(pulse.active).toBe(true);
      expect(pulse.frequency).toBeGreaterThan(0);
      expect(pulse.color).toBe('#ef4444');
    });

    it('should return inactive when not rate limited', () => {
      const pulse = deriveAlarmBellPulse({ rateLimited: false });
      expect(pulse.active).toBe(false);
    });
  });
});
