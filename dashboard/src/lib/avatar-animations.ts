import type { AgentActivity } from '@/types/agent';

/**
 * Color map for agent types (REQ-036).
 * Each agent type gets a distinct color for its avatar body.
 */
export const AGENT_COLORS: Record<string, string> = {
  main: '#4285f4',
  'code-critic': '#34a853',
  'security-reviewer': '#ea4335',
  'plan-validator': '#9334e6',
  'spec-compliance-reviewer': '#f59e0b',
  Explore: '#06b6d4',
  'claude-code-guide': '#ec4899',
};

const FALLBACK_COLOR = '#8b5cf6';

/**
 * Returns the hex color for a given agent type, with a fallback for unknown types.
 */
export function getAgentColor(agentType: string): string {
  return AGENT_COLORS[agentType] ?? FALLBACK_COLOR;
}

/** Animation state for the avatar (subset of AgentActivity that maps to distinct animations). */
export type AnimationState = 'idle' | 'typing' | 'reading' | 'walking' | 'chatting' | 'waiting';

/**
 * Maps an AgentActivity to one of the three supported animation states.
 * Activities without a unique animation (chatting, waiting) fall back to idle.
 */
export function resolveAnimationState(activity: AgentActivity): AnimationState {
  if (activity === 'typing') return 'typing';
  if (activity === 'reading') return 'reading';
  if (activity === 'walking') return 'walking';
  if (activity === 'chatting') return 'chatting';
  if (activity === 'waiting') return 'waiting';
  return 'idle';
}

// ----- Pure animation transform functions (REQ-037) -----

export interface IdleTransform {
  bodyY: number;
  headY: number;
}

/**
 * Subtle breathing bob for idle state.
 * @param time Elapsed time in seconds (from useFrame clock).
 */
export function getIdleTransform(time: number): IdleTransform {
  const bob = Math.sin(time * 1.5) * 0.01;
  return {
    bodyY: bob,
    headY: bob * 1.2,
  };
}

export interface TypingTransform {
  leftArmRotationX: number;
  rightArmRotationX: number;
  headRotationX: number;
}

/**
 * Arm oscillation for typing state.
 * @param time Elapsed time in seconds.
 */
export function getTypingTransform(time: number): TypingTransform {
  return {
    leftArmRotationX: -0.7 + Math.sin(time * 12) * 0.08,
    rightArmRotationX: -0.7 + Math.cos(time * 14) * 0.08,
    headRotationX: -0.1 + Math.sin(time * 0.5) * 0.02,
  };
}

export interface ReadingTransform {
  headRotationX: number;
  headRotationY: number;
}

/**
 * Head tilt for reading state.
 * @param time Elapsed time in seconds.
 */
export function getReadingTransform(time: number): ReadingTransform {
  return {
    headRotationX: -0.15,
    headRotationY: Math.sin(time * 0.8) * 0.1,
  };
}

// ----- Walking animation (REQ-038) -----

export interface WalkingTransform {
  leftArmRotationX: number;
  rightArmRotationX: number;
  bodyBob: number;
  headBob: number;
}

/**
 * Arm swing and body bob for walking state.
 * @param time Elapsed time in seconds.
 */
export function getWalkingTransform(time: number): WalkingTransform {
  const swing = Math.sin(time * 8) * 0.4;
  const bob = Math.abs(Math.sin(time * 8)) * 0.06;
  return {
    leftArmRotationX: swing,
    rightArmRotationX: -swing,
    bodyBob: bob,
    headBob: bob,
  };
}

// ----- Chatting animation (REQ-041) -----

export interface ChattingTransform {
  leftArmRotationX: number;
  leftArmRotationZ: number;
  rightArmRotationX: number;
  rightArmRotationZ: number;
  headRotationY: number;
  headRotationX: number;
  bodySway: number;
}

/**
 * Arm gestures and head turns for chatting state.
 * @param time Elapsed time in seconds.
 */
export function getChattingTransform(time: number): ChattingTransform {
  const gesture = Math.sin(time * 2.5);
  return {
    leftArmRotationX: -0.3 + gesture * 0.25,
    leftArmRotationZ: -0.15,
    rightArmRotationX: -0.3 - gesture * 0.2,
    rightArmRotationZ: 0.15,
    headRotationY: Math.sin(time * 1.2) * 0.12,
    headRotationX: Math.sin(time * 0.8) * 0.04,
    bodySway: Math.sin(time * 1.0) * 0.008,
  };
}

// ----- Waiting animation (REQ-042) -----

export interface WaitingTransform {
  emissivePulse: number;
  bodySway: number;
}

/**
 * Emissive pulse and weight shift for waiting state.
 * @param time Elapsed time in seconds.
 */
export function getWaitingTransform(time: number): WaitingTransform {
  const pulse = (Math.sin(time * 3) + 1) * 0.5;
  return {
    emissivePulse: pulse * 0.3,
    bodySway: Math.sin(time * 0.8) * 0.03,
  };
}

// ----- Sitting pose (REQ-039, REQ-040) -----

export interface SittingPose {
  bodyDrop: number;
  legRotationX: number;
}

/**
 * Static sitting pose offsets for typing/reading states.
 */
export function getSittingPose(): SittingPose {
  return {
    bodyDrop: 0.08,
    legRotationX: -Math.PI / 2.2,
  };
}
