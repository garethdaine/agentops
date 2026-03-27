import type { TelemetryEvent } from '@/types/events';

/** A recorded event wrapping the original telemetry payload. */
export interface RecordedEvent {
  /** ISO 8601 timestamp when the event was recorded. */
  recordedAt: string;
  /** Original timestamp from the telemetry event. */
  originalTs: string;
  /** The original telemetry event payload. */
  payload: TelemetryEvent;
}

/** Current state of the session recorder. */
export interface RecordingState {
  /** Whether the recorder is actively capturing events. */
  isRecording: boolean;
  /** Current recording identifier, null when not recording. */
  recordingId: string | null;
  /** Number of events captured in the current recording. */
  eventCount: number;
}

export interface SessionRecorderOptions {
  /** Maximum number of events to store. Defaults to 50000. */
  maxEvents?: number;
  /** Optional callback invoked when recording state changes. */
  onStateChange?: (state: RecordingState) => void;
}

/** Create a RecordedEvent from a TelemetryEvent. */
function createRecordedEvent(event: TelemetryEvent): RecordedEvent {
  return {
    recordedAt: new Date().toISOString(),
    originalTs: event.ts,
    payload: event,
  };
}

/** Generate a unique recording identifier. */
function generateRecordingId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Session recorder that captures telemetry events into an in-memory
 * append-only log for later export as JSONL.
 */
export class SessionRecorder {
  private events: RecordedEvent[] = [];
  private recording = false;
  private currentRecordingId: string | null = null;
  private readonly maxEvents: number;
  private readonly onStateChange?: (state: RecordingState) => void;

  constructor(options: SessionRecorderOptions = {}) {
    this.maxEvents = options.maxEvents ?? 50_000;
    this.onStateChange = options.onStateChange;
  }

  /** Start a new recording session, clearing any previous events. */
  start(): string {
    this.events = [];
    this.recording = true;
    this.currentRecordingId = generateRecordingId();
    this.notifyStateChange();
    return this.currentRecordingId;
  }

  /** Stop the current recording, preserving events for export. */
  stop(): void {
    this.recording = false;
    this.notifyStateChange();
  }

  /** Append a telemetry event if recording is active. */
  appendEvent(event: TelemetryEvent): void {
    if (!this.recording) return;
    if (this.events.length >= this.maxEvents) return;
    this.events.push(createRecordedEvent(event));
    this.notifyStateChange();
  }

  /** Return a copy of all recorded events. */
  getEvents(): RecordedEvent[] {
    return [...this.events];
  }

  /** Return the current recording state. */
  getState(): RecordingState {
    return {
      isRecording: this.recording,
      recordingId: this.currentRecordingId,
      eventCount: this.events.length,
    };
  }

  /** Export recorded events as JSONL (one JSON object per line). */
  exportJSONL(): string {
    if (this.events.length === 0) return '';
    return this.events.map((e) => JSON.stringify(e)).join('\n');
  }

  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }
}
