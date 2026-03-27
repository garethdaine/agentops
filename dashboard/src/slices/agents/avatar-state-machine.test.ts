import { describe, it, expect } from 'vitest';
import {
  AVATAR_STATES,
  AvatarState,
  createStateMachine,
  isValidTransition,
  smoothstep,
  blendTransforms,
} from './avatar-state-machine';
import {
  getWalkingTransform,
  getChattingTransform,
  getWaitingTransform,
  getSittingPose,
  type WalkingTransform,
  type ChattingTransform,
  type WaitingTransform,
  type SittingPose,
} from '@/lib/avatar-animations';

describe('AVATAR_STATES', () => {
  it('should define exactly 6 states', () => {
    const states: AvatarState[] = ['idle', 'walking', 'typing', 'reading', 'chatting', 'waiting'];
    expect(states).toHaveLength(6);
    states.forEach((s) => {
      expect(AVATAR_STATES).toContain(s);
    });
  });
});

describe('isValidTransition', () => {
  it('should allow idle -> walking', () => {
    expect(isValidTransition('idle', 'walking')).toBe(true);
  });

  it('should allow walking -> idle (arrival)', () => {
    expect(isValidTransition('walking', 'idle')).toBe(true);
  });

  it('should allow walking -> typing (arrive at desk)', () => {
    expect(isValidTransition('walking', 'typing')).toBe(true);
  });

  it('should allow walking -> chatting (arrive at zone)', () => {
    expect(isValidTransition('walking', 'chatting')).toBe(true);
  });

  it('should allow walking -> reading (arrive at zone)', () => {
    expect(isValidTransition('walking', 'reading')).toBe(true);
  });

  it('should allow typing -> idle', () => {
    expect(isValidTransition('typing', 'idle')).toBe(true);
  });

  it('should allow idle -> typing', () => {
    expect(isValidTransition('idle', 'typing')).toBe(true);
  });

  it('should allow any state -> walking (zone reassignment)', () => {
    const allStates: AvatarState[] = ['idle', 'typing', 'reading', 'chatting', 'waiting'];
    allStates.forEach((s) => {
      expect(isValidTransition(s, 'walking')).toBe(true);
    });
  });

  it('should reject typing -> chatting (must walk between seated states)', () => {
    expect(isValidTransition('typing', 'chatting')).toBe(false);
  });

  it('should reject reading -> typing directly', () => {
    expect(isValidTransition('reading', 'typing')).toBe(false);
  });
});

describe('createStateMachine', () => {
  it('should start in idle state', () => {
    const fsm = createStateMachine();
    expect(fsm.current).toBe('idle');
  });

  it('should transition to walking on valid request', () => {
    const fsm = createStateMachine();
    const ok = fsm.transition('walking');
    expect(ok).toBe(true);
    expect(fsm.current).toBe('walking');
  });

  it('should reject invalid transitions', () => {
    const fsm = createStateMachine();
    fsm.transition('typing');
    const ok = fsm.transition('chatting');
    expect(ok).toBe(false);
    expect(fsm.current).toBe('typing');
  });

  it('should track blend progress after transition', () => {
    const fsm = createStateMachine();
    fsm.transition('walking');
    expect(fsm.blendProgress).toBe(0);
    fsm.tick(150); // 150ms into 300ms blend
    expect(fsm.blendProgress).toBeCloseTo(0.5, 1);
    fsm.tick(150);
    expect(fsm.blendProgress).toBeCloseTo(1, 1);
  });

  it('should expose previous state during blend', () => {
    const fsm = createStateMachine();
    fsm.transition('walking');
    expect(fsm.previous).toBe('idle');
    fsm.tick(300);
    expect(fsm.previous).toBe('idle');
  });
});

describe('smoothstep', () => {
  it('should return 0 at t=0', () => {
    expect(smoothstep(0)).toBe(0);
  });

  it('should return 1 at t=1', () => {
    expect(smoothstep(1)).toBe(1);
  });

  it('should return 0.5 at t=0.5', () => {
    expect(smoothstep(0.5)).toBe(0.5);
  });

  it('should clamp values below 0', () => {
    expect(smoothstep(-0.5)).toBe(0);
  });

  it('should clamp values above 1', () => {
    expect(smoothstep(1.5)).toBe(1);
  });
});

describe('blendTransforms', () => {
  it('should return target values at progress=1', () => {
    const from = { bodyY: 0, headY: 0 };
    const to = { bodyY: 1, headY: 2 };
    const result = blendTransforms(from, to, 1);
    expect(result.bodyY).toBeCloseTo(1);
    expect(result.headY).toBeCloseTo(2);
  });

  it('should return source values at progress=0', () => {
    const from = { bodyY: 5, headY: 3 };
    const to = { bodyY: 1, headY: 2 };
    const result = blendTransforms(from, to, 0);
    expect(result.bodyY).toBeCloseTo(5);
    expect(result.headY).toBeCloseTo(3);
  });

  it('should interpolate at progress=0.5', () => {
    const from = { bodyY: 0, headY: 0 };
    const to = { bodyY: 10, headY: 20 };
    const result = blendTransforms(from, to, 0.5);
    expect(result.bodyY).toBeCloseTo(5);
    expect(result.headY).toBeCloseTo(10);
  });
});

describe('new animation functions', () => {
  describe('getWalkingTransform', () => {
    it('should return arm swing and body bob', () => {
      const t = getWalkingTransform(1.0);
      expect(t).toHaveProperty('leftArmRotationX');
      expect(t).toHaveProperty('rightArmRotationX');
      expect(t).toHaveProperty('bodyBob');
      expect(t).toHaveProperty('headBob');
    });

    it('should produce opposing arm swings', () => {
      const t = getWalkingTransform(0.5);
      // Arms swing opposite: sin vs -sin
      expect(Math.sign(t.leftArmRotationX)).not.toBe(Math.sign(t.rightArmRotationX));
    });
  });

  describe('getChattingTransform', () => {
    it('should return arm gesture and head rotation', () => {
      const t = getChattingTransform(1.0);
      expect(t).toHaveProperty('leftArmRotationX');
      expect(t).toHaveProperty('leftArmRotationZ');
      expect(t).toHaveProperty('headRotationY');
    });
  });

  describe('getWaitingTransform', () => {
    it('should return pulse and sway values', () => {
      const t = getWaitingTransform(1.0);
      expect(t).toHaveProperty('emissivePulse');
      expect(t).toHaveProperty('bodySway');
      expect(t.emissivePulse).toBeGreaterThanOrEqual(0);
      expect(t.emissivePulse).toBeLessThanOrEqual(0.3);
    });
  });

  describe('getSittingPose', () => {
    it('should return a body drop offset', () => {
      const pose = getSittingPose();
      expect(pose.bodyDrop).toBeCloseTo(0.08);
      expect(pose.legRotationX).toBeLessThan(0);
    });
  });
});
