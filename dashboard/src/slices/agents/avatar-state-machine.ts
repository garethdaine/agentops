/**
 * 6-state avatar finite state machine with smooth blending (REQ-036, REQ-043).
 *
 * States: idle, walking, typing, reading, chatting, waiting
 * Transitions are constrained: seated states cannot go directly to other seated states.
 * Walking is reachable from every state (zone reassignment).
 * Blend progress advances from 0 to 1 over BLEND_DURATION_MS using smoothstep easing.
 */

export type AvatarState = 'idle' | 'walking' | 'typing' | 'reading' | 'chatting' | 'waiting';

export const AVATAR_STATES: readonly AvatarState[] = [
  'idle',
  'walking',
  'typing',
  'reading',
  'chatting',
  'waiting',
] as const;

/** Duration of a state blend transition in milliseconds. */
export const BLEND_DURATION_MS = 300;

/**
 * Transition table: maps each state to its set of valid successor states.
 * Walking is reachable from every state. Seated states (typing, reading,
 * chatting) cannot transition directly to each other -- the agent must
 * walk between them.
 */
export const TRANSITION_TABLE: Record<AvatarState, ReadonlySet<AvatarState>> = {
  idle: new Set<AvatarState>(['walking', 'typing', 'reading', 'chatting', 'waiting']),
  walking: new Set<AvatarState>(['idle', 'typing', 'reading', 'chatting', 'waiting']),
  typing: new Set<AvatarState>(['idle', 'walking']),
  reading: new Set<AvatarState>(['idle', 'walking']),
  chatting: new Set<AvatarState>(['idle', 'walking']),
  waiting: new Set<AvatarState>(['idle', 'walking']),
};

/**
 * Returns true if transitioning from `from` to `to` is valid per the table.
 */
export function isValidTransition(from: AvatarState, to: AvatarState): boolean {
  return TRANSITION_TABLE[from].has(to);
}

// ----- Blend timer -----

class BlendTimer {
  private _elapsed = 0;
  private _active = false;

  get progress(): number {
    if (!this._active) return 1;
    return Math.min(this._elapsed / BLEND_DURATION_MS, 1);
  }

  /** Start a new blend from 0. */
  reset(): void {
    this._elapsed = 0;
    this._active = true;
  }

  /** Advance by `deltaMs` milliseconds. */
  advance(deltaMs: number): void {
    if (!this._active) return;
    this._elapsed += deltaMs;
    if (this._elapsed >= BLEND_DURATION_MS) {
      this._active = false;
    }
  }
}

// ----- State machine factory -----

export interface AvatarStateMachine {
  /** The current (target) state. */
  readonly current: AvatarState;
  /** The previous state (source of blend). */
  readonly previous: AvatarState;
  /** Blend progress from 0 (previous) to 1 (current), linear before smoothstep. */
  readonly blendProgress: number;
  /** Attempt a transition. Returns true if accepted. */
  transition(to: AvatarState): boolean;
  /** Advance blend timer by `deltaMs` milliseconds. */
  tick(deltaMs: number): void;
}

/**
 * Creates a new avatar state machine starting in idle.
 */
export function createStateMachine(): AvatarStateMachine {
  let current: AvatarState = 'idle';
  let previous: AvatarState = 'idle';
  const timer = new BlendTimer();
  // Start fully blended
  timer.reset();
  timer.advance(BLEND_DURATION_MS);

  return {
    get current() {
      return current;
    },
    get previous() {
      return previous;
    },
    get blendProgress() {
      return timer.progress;
    },
    transition(to: AvatarState): boolean {
      if (!isValidTransition(current, to)) return false;
      previous = current;
      current = to;
      timer.reset();
      return true;
    },
    tick(deltaMs: number): void {
      timer.advance(deltaMs);
    },
  };
}

// ----- Smoothstep & blend utilities -----

/**
 * Hermite smoothstep: t * t * (3 - 2 * t), clamped to [0, 1].
 */
export function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Linearly interpolates all numeric keys of two transform objects.
 * Both objects must share the same keys.
 */
export function blendTransforms<T extends Record<string, number>>(
  from: T,
  to: T,
  progress: number,
): T {
  const result = {} as Record<string, number>;
  for (const key of Object.keys(from)) {
    const a = from[key];
    const b = to[key];
    result[key] = a + (b - a) * progress;
  }
  return result as T;
}
