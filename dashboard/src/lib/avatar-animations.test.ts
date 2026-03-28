import { describe, it, expect } from 'vitest';
import {
  getIdleTransform,
  getTypingTransform,
  getReadingTransform,
  resolveAnimationState,
  AGENT_COLORS,
  getAgentColor,
} from './avatar-animations';
import type { AgentActivity } from '@/types/agent';

describe('avatar-animations', () => {
  describe('getIdleTransform', () => {
    it('should return a subtle vertical bob', () => {
      const t0 = getIdleTransform(0);
      const t1 = getIdleTransform(1);
      expect(t0).toHaveProperty('bodyY');
      expect(t0).toHaveProperty('headY');
      // At time 0, sin(0) = 0, so offset should be 0
      expect(t0.bodyY).toBeCloseTo(0, 2);
      // At a different time the bob should differ
      expect(t1.bodyY).not.toBeCloseTo(t0.bodyY, 5);
    });

    it('should keep head bob proportional to body bob', () => {
      const t = getIdleTransform(0.5);
      // Head bob is amplified relative to body
      expect(Math.abs(t.headY)).toBeGreaterThanOrEqual(Math.abs(t.bodyY));
    });
  });

  describe('getTypingTransform', () => {
    it('should return arm oscillation values', () => {
      const t = getTypingTransform(0.5);
      expect(t).toHaveProperty('leftArmRotationX');
      expect(t).toHaveProperty('rightArmRotationX');
      expect(t).toHaveProperty('headRotationX');
    });

    it('should produce different arm positions at different times', () => {
      const t0 = getTypingTransform(0);
      const t1 = getTypingTransform(0.3);
      expect(t0.leftArmRotationX).not.toBeCloseTo(t1.leftArmRotationX, 5);
    });
  });

  describe('getReadingTransform', () => {
    it('should return head tilt values', () => {
      const t = getReadingTransform(0.5);
      expect(t).toHaveProperty('headRotationX');
      expect(t).toHaveProperty('headRotationY');
      // Head should be tilted downward (negative X rotation)
      expect(t.headRotationX).toBeLessThan(0);
    });

    it('should have slow lateral head sway', () => {
      const t0 = getReadingTransform(0);
      const t1 = getReadingTransform(2);
      expect(t0.headRotationY).not.toBeCloseTo(t1.headRotationY, 5);
    });
  });

  describe('resolveAnimationState', () => {
    it('should return "idle" for idle activity', () => {
      expect(resolveAnimationState('idle')).toBe('idle');
    });

    it('should return "typing" for typing activity', () => {
      expect(resolveAnimationState('typing')).toBe('typing');
    });

    it('should return "reading" for reading activity', () => {
      expect(resolveAnimationState('reading')).toBe('reading');
    });

    it('should return "chatting" for chatting activity', () => {
      expect(resolveAnimationState('chatting')).toBe('chatting');
    });

    it('should return "waiting" for waiting activity', () => {
      expect(resolveAnimationState('waiting')).toBe('waiting');
    });

    it('should default to "idle" for unknown activities', () => {
      expect(resolveAnimationState('idle')).toBe('idle');
    });
  });

  describe('AGENT_COLORS', () => {
    it('should have a color for main agent type', () => {
      expect(AGENT_COLORS.main).toBe('#4285f4');
    });

    it('should have a color for code-critic', () => {
      expect(AGENT_COLORS['code-critic']).toBe('#34a853');
    });

    it('should have a color for security-reviewer', () => {
      expect(AGENT_COLORS['security-reviewer']).toBe('#ea4335');
    });

    it('should have a color for plan-validator', () => {
      expect(AGENT_COLORS['plan-validator']).toBe('#9334e6');
    });
  });

  describe('getAgentColor', () => {
    it('should return the mapped color for a known type', () => {
      expect(getAgentColor('main')).toBe('#4285f4');
    });

    it('should return a fallback color for unknown types', () => {
      const color = getAgentColor('unknown-type');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
      expect(color.startsWith('#')).toBe(true);
    });
  });
});
