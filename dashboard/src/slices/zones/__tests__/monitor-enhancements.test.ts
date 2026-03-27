import { describe, it, expect } from 'vitest';
import {
  getMonitorLedColor,
  getMonitorEmissive,
  getWarRoomEmissiveState,
} from '../monitor-enhancements';
import type { AgentActivity } from '@/types/agent';

describe('Monitor Screen Enhancements', () => {
  describe('getMonitorLedColor', () => {
    it('should return green for typing activity', () => {
      expect(getMonitorLedColor('typing')).toBe('#10b981');
    });

    it('should return blue for reading activity', () => {
      expect(getMonitorLedColor('reading')).toBe('#3b82f6');
    });

    it('should return orange for chatting activity', () => {
      expect(getMonitorLedColor('chatting')).toBe('#f59e0b');
    });

    it('should return amber for waiting activity', () => {
      expect(getMonitorLedColor('waiting')).toBe('#ff8844');
    });

    it('should return dim grey for idle activity', () => {
      expect(getMonitorLedColor('idle')).toBe('#334455');
    });

    it('should handle unknown activity as idle', () => {
      expect(getMonitorLedColor('unknown' as AgentActivity)).toBe('#334455');
    });
  });

  describe('getMonitorEmissive', () => {
    it('should return higher intensity for active activities', () => {
      const typingEmissive = getMonitorEmissive('typing');
      const idleEmissive = getMonitorEmissive('idle');
      expect(typingEmissive.intensity).toBeGreaterThan(idleEmissive.intensity);
    });

    it('should return emissive color matching activity', () => {
      const emissive = getMonitorEmissive('typing');
      expect(emissive.color).toBe('#002211');
      expect(emissive.intensity).toBeCloseTo(0.15, 1);
    });

    it('should return subdued emissive for idle', () => {
      const emissive = getMonitorEmissive('idle');
      expect(emissive.color).toBe('#001108');
      expect(emissive.intensity).toBeCloseTo(0.05, 1);
    });
  });

  describe('getWarRoomEmissiveState', () => {
    it('should return active emissive when runs are active', () => {
      const state = getWarRoomEmissiveState(3);
      expect(state.active).toBe(true);
      expect(state.emissiveIntensity).toBeGreaterThan(0.2);
      expect(state.emissiveColor).toMatch(/^#/);
    });

    it('should return inactive emissive when no runs active', () => {
      const state = getWarRoomEmissiveState(0);
      expect(state.active).toBe(false);
      expect(state.emissiveIntensity).toBeLessThanOrEqual(0.05);
    });

    it('should scale intensity with active run count up to a cap', () => {
      const state1 = getWarRoomEmissiveState(1);
      const state5 = getWarRoomEmissiveState(5);
      expect(state5.emissiveIntensity).toBeGreaterThanOrEqual(state1.emissiveIntensity);
    });

    it('should cap intensity at maximum regardless of run count', () => {
      const state100 = getWarRoomEmissiveState(100);
      expect(state100.emissiveIntensity).toBeLessThanOrEqual(1.0);
    });
  });
});
