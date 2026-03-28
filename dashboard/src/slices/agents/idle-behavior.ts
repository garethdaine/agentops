/**
 * Idle behavior scheduler — weighted zone wandering for agents (REQ-052 to REQ-055).
 *
 * Ports the reference IdleBehaviorScheduler to TypeScript with proper typing.
 * Each registered agent cycles through phases: at_desk -> walking_to -> at_zone -> returning.
 * Busy agents are immediately recalled to their desk.
 */

import type { AvatarState } from './avatar-state-machine';

// ----- Types -----

export type IdlePhase = 'at_desk' | 'walking_to' | 'at_zone' | 'returning';

export interface WanderZone {
  readonly zoneId: string;
  readonly activity: AvatarState;
  readonly weight: number;
  readonly minStay: number;
  readonly maxStay: number;
}

export interface IdleEntry {
  agentId: string;
  home: { x: number; z: number };
  phase: IdlePhase;
  timer: number;
  currentZone: string | null;
  busy: boolean;
}

export interface SchedulerApi {
  moveToZone: (agentId: string, zoneId: string) => void;
  moveToPosition: (agentId: string, pos: { x: number; z: number }) => void;
  setState: (agentId: string, state: AvatarState) => void;
}

// ----- Constants -----

export const WANDER_ZONES: readonly WanderZone[] = [
  { zoneId: 'breakRoom', activity: 'chatting', weight: 3, minStay: 6, maxStay: 15 },
  { zoneId: 'conference', activity: 'chatting', weight: 2, minStay: 5, maxStay: 12 },
  { zoneId: 'mailroom', activity: 'reading', weight: 2, minStay: 4, maxStay: 8 },
  { zoneId: 'vault', activity: 'reading', weight: 1, minStay: 5, maxStay: 10 },
  { zoneId: 'toolWorkshop', activity: 'typing', weight: 1, minStay: 4, maxStay: 8 },
  { zoneId: 'warRoom', activity: 'reading', weight: 1, minStay: 3, maxStay: 7 },
];

const WORKSTATION_IDLE_MIN = 8;
const WORKSTATION_IDLE_MAX = 25;

// ----- Helpers -----

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Pick a random wander zone using weighted selection, optionally excluding one zone.
 */
export function pickWeightedZone(exclude: string | null): WanderZone {
  const candidates = WANDER_ZONES.filter((z) => z.zoneId !== exclude);
  const totalWeight = candidates.reduce((sum, z) => sum + z.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const zone of candidates) {
    roll -= zone.weight;
    if (roll <= 0) return zone;
  }
  return candidates[candidates.length - 1];
}

// ----- Scheduler -----

export class IdleBehaviorScheduler {
  private _agents = new Map<string, IdleEntry>();

  /** Register an agent with its home (desk) position. */
  register(agentId: string, homePosition: { x: number; z: number }): void {
    this._agents.set(agentId, {
      agentId,
      home: { x: homePosition.x, z: homePosition.z },
      phase: 'at_desk',
      timer: rand(2, WORKSTATION_IDLE_MAX),
      currentZone: null,
      busy: false,
    });
  }

  /** Remove an agent from the scheduler. */
  unregister(agentId: string): void {
    this._agents.delete(agentId);
  }

  /** Get entry for inspection (mutable ref for test convenience). */
  getEntry(agentId: string): IdleEntry | undefined {
    return this._agents.get(agentId);
  }

  /** Set or clear busy flag. Busy agents return to desk immediately. */
  setBusy(agentId: string, busy: boolean): void {
    const entry = this._agents.get(agentId);
    if (!entry) return;
    const wasBusy = entry.busy;
    entry.busy = busy;

    if (busy && !wasBusy) {
      this._handleBecameBusy(entry);
    } else if (!busy && wasBusy) {
      this._handleBecameIdle(entry);
    }
  }

  /** Force an agent to return to desk from any phase. */
  forceReturn(agentId: string, api: SchedulerApi): void {
    const entry = this._agents.get(agentId);
    if (!entry) return;
    entry.phase = 'returning';
    entry.timer = 999;
    api.moveToPosition(agentId, entry.home);
  }

  /** Advance all agent timers and dispatch phase transitions. */
  tick(delta: number, api: SchedulerApi): void {
    this._agents.forEach((entry) => {
      if (entry.busy) return;
      entry.timer -= delta;
      if (entry.timer > 0) return;
      this._handlePhaseExpiry(entry, api);
    });
  }

  /** Remove all agents. */
  dispose(): void {
    this._agents.clear();
  }

  // ----- Private phase handlers -----

  private _handleBecameBusy(entry: IdleEntry): void {
    entry.phase = 'returning';
    entry.timer = 0;
    entry.currentZone = null;
  }

  private _handleBecameIdle(entry: IdleEntry): void {
    entry.phase = 'at_desk';
    entry.timer = rand(WORKSTATION_IDLE_MIN, WORKSTATION_IDLE_MAX);
  }

  private _handlePhaseExpiry(entry: IdleEntry, api: SchedulerApi): void {
    switch (entry.phase) {
      case 'at_desk':
        this._dispatchWander(entry, api);
        break;
      case 'at_zone':
        this._dispatchLeaveZone(entry, api);
        break;
      case 'walking_to':
      case 'returning':
        break;
    }
  }

  private _dispatchWander(entry: IdleEntry, api: SchedulerApi): void {
    const dest = pickWeightedZone(entry.currentZone);
    entry.currentZone = dest.zoneId;
    entry.phase = 'walking_to';
    entry.timer = 999;
    api.moveToZone(entry.agentId, dest.zoneId);
  }

  private _dispatchLeaveZone(entry: IdleEntry, api: SchedulerApi): void {
    const goHome = Math.random() < 0.5;
    if (goHome) {
      entry.phase = 'returning';
      entry.timer = 999;
      api.moveToPosition(entry.agentId, entry.home);
    } else {
      this._dispatchWander(entry, api);
    }
  }
}
