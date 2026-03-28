import type { RecordedEvent } from './session-recorder';

/** Reconstructed state at a point in time during replay. */
export interface ReconstructedState {
  /** Number of events processed to reach this state. */
  processedEvents: number;
  /** Map of session IDs to their last-seen agent info. */
  agents: Map<string, { session: string; tool: string; lastEvent: string }>;
  /** Set of active sessions. */
  sessions: Set<string>;
}

/** A snapshot of reconstructed state at a specific event index. */
export interface Snapshot {
  /** The event index this snapshot was taken at. */
  index: number;
  /** The reconstructed state at this index. */
  state: ReconstructedState;
}

/** Timing information for a specific event. */
export interface EventTiming {
  /** Delay in ms from the previous event (original pace). */
  originalDelayMs: number;
  /** Delay adjusted for current playback speed. */
  adjustedDelayMs: number;
}

/** Current state of the replay engine. */
export interface ReplayState {
  /** Total number of events loaded. */
  totalEvents: number;
  /** Current event index (0 = beginning). */
  currentIndex: number;
  /** Whether playback is active. */
  isPlaying: boolean;
  /** Current playback speed multiplier. */
  speed: number;
  /** Whether the engine is in replay mode. */
  isReplaying: boolean;
}

const MIN_SPEED = 0.5;
const MAX_SPEED = 4.0;
const SNAPSHOT_INTERVAL = 500;

/** Clamp a number between min and max. */
function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Create an empty reconstructed state. */
function createEmptyState(): ReconstructedState {
  return {
    processedEvents: 0,
    agents: new Map(),
    sessions: new Set(),
  };
}

/** Clone a reconstructed state (deep copy of maps/sets). */
function cloneState(state: ReconstructedState): ReconstructedState {
  return {
    processedEvents: state.processedEvents,
    agents: new Map(
      Array.from(state.agents.entries()).map(([k, v]) => [k, { ...v }]),
    ),
    sessions: new Set(state.sessions),
  };
}

/** Apply a single event to a reconstructed state (mutates). */
function applyEventToState(
  state: ReconstructedState,
  event: RecordedEvent,
): void {
  const { payload } = event;
  state.sessions.add(payload.session);
  state.agents.set(payload.session, {
    session: payload.session,
    tool: payload.tool,
    lastEvent: payload.event,
  });
  state.processedEvents += 1;
}

/**
 * Manages snapshots for fast seeking through event logs.
 * Snapshots are taken every SNAPSHOT_INTERVAL events.
 */
class SnapshotManager {
  private snapshots: Snapshot[] = [];

  /** Build snapshots from a list of events. */
  buildSnapshots(events: RecordedEvent[]): void {
    this.snapshots = [];
    if (events.length < SNAPSHOT_INTERVAL) return;

    const state = createEmptyState();
    for (let i = 0; i < events.length; i++) {
      applyEventToState(state, events[i]);
      if ((i + 1) % SNAPSHOT_INTERVAL === 0) {
        this.snapshots.push({ index: i + 1, state: cloneState(state) });
      }
    }
  }

  /** Get all snapshots. */
  getSnapshots(): Snapshot[] {
    return this.snapshots;
  }

  /** Find the nearest snapshot at or before a given index. */
  findNearestSnapshot(index: number): Snapshot | null {
    let best: Snapshot | null = null;
    for (const snap of this.snapshots) {
      if (snap.index <= index) {
        best = snap;
      } else {
        break;
      }
    }
    return best;
  }

  /** Clear all snapshots. */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Abstraction over the playback clock for testability.
 * In production uses requestAnimationFrame; can be mocked in tests.
 */
class PlaybackClock {
  private frameId: number | null = null;
  private callback: (() => void) | null = null;

  /** Start the clock with a per-frame callback. */
  start(callback: () => void): void {
    this.callback = callback;
    this.tick();
  }

  /** Stop the clock. */
  stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.callback = null;
  }

  private tick(): void {
    if (!this.callback) return;
    this.callback();
    this.frameId = requestAnimationFrame(() => this.tick());
  }
}

/**
 * Engine for replaying recorded session events with play/pause,
 * speed control, seeking, and snapshot-based fast navigation.
 */
export class ReplayEngine {
  private events: RecordedEvent[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private speed = 1.0;
  private isReplaying = false;
  private snapshotManager = new SnapshotManager();
  private clock = new PlaybackClock();
  private eventProcessedCallback: ((event: RecordedEvent) => void) | null =
    null;

  /** Load an array of recorded events for replay. */
  loadEvents(events: RecordedEvent[]): void {
    if (events.length === 0) {
      throw new Error('Cannot replay empty event log');
    }
    this.events = [...events];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isReplaying = true;
    this.snapshotManager.buildSnapshots(this.events);
  }

  /** Parse and load events from a JSONL string. */
  loadFromJSONL(jsonl: string): void {
    const events = jsonl
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as RecordedEvent);
    this.loadEvents(events);
  }

  /** Get the current replay state. */
  getState(): ReplayState {
    return {
      totalEvents: this.events.length,
      currentIndex: this.currentIndex,
      isPlaying: this.isPlaying,
      speed: this.speed,
      isReplaying: this.isReplaying,
    };
  }

  /** Reconstruct state at a given event index. */
  reconstructStateAt(index: number): ReconstructedState {
    const clamped = clampValue(index, 0, this.events.length);
    const snapshot = this.snapshotManager.findNearestSnapshot(clamped);

    if (snapshot && snapshot.index <= clamped) {
      const state = cloneState(snapshot.state);
      for (let i = snapshot.index; i < clamped; i++) {
        applyEventToState(state, this.events[i]);
      }
      return state;
    }

    const state = createEmptyState();
    for (let i = 0; i < clamped; i++) {
      applyEventToState(state, this.events[i]);
    }
    return state;
  }

  /** Get all snapshots. */
  getSnapshots(): Snapshot[] {
    return this.snapshotManager.getSnapshots();
  }

  /** Register a callback invoked for each event processed during seek. */
  onEventProcessed(callback: (event: RecordedEvent) => void): void {
    this.eventProcessedCallback = callback;
  }

  /** Seek to a specific event index. */
  seekTo(index: number): void {
    const clamped = clampValue(index, 0, this.events.length);
    const snapshot = this.snapshotManager.findNearestSnapshot(clamped);
    const startFrom = snapshot ? snapshot.index : 0;

    if (this.eventProcessedCallback) {
      for (let i = startFrom; i < clamped; i++) {
        this.eventProcessedCallback(this.events[i]);
      }
    }

    this.currentIndex = clamped;
  }

  /** Start playback. */
  play(): void {
    if (this.events.length === 0) return;
    this.isPlaying = true;
  }

  /** Pause playback. */
  pause(): void {
    this.isPlaying = false;
    this.clock.stop();
  }

  /** Stop replay entirely and reset state. */
  stop(): void {
    this.isPlaying = false;
    this.isReplaying = false;
    this.clock.stop();
    this.eventProcessedCallback = null;
  }

  /** Set playback speed (clamped to 0.5x-4x). */
  setSpeed(speed: number): void {
    this.speed = clampValue(speed, MIN_SPEED, MAX_SPEED);
  }

  /** Get timing information for an event at a given index. */
  getEventTimingAt(index: number): EventTiming {
    if (index <= 0 || index >= this.events.length) {
      return { originalDelayMs: 0, adjustedDelayMs: 0 };
    }

    const prevTs = new Date(this.events[index - 1].recordedAt).getTime();
    const currTs = new Date(this.events[index].recordedAt).getTime();
    const originalDelayMs = Math.max(0, currTs - prevTs);

    return {
      originalDelayMs,
      adjustedDelayMs: originalDelayMs / this.speed,
    };
  }
}
