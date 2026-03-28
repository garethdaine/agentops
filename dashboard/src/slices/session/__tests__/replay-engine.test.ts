import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ReplayEngine,
  type ReplayState,
  type Snapshot,
} from '../replay-engine';
import type { RecordedEvent } from '../session-recorder';

function makeEvent(index: number, sessionId = 's1'): RecordedEvent {
  const ts = new Date(Date.UTC(2026, 2, 26, 10, 0, index)).toISOString();
  return {
    recordedAt: ts,
    originalTs: ts,
    payload: {
      event: index % 2 === 0 ? 'PreToolUse' : 'PostToolUse',
      session: sessionId,
      tool: `Tool${index}`,
      ts,
      cwd: '/project',
    },
  };
}

function makeEventLog(count: number): RecordedEvent[] {
  return Array.from({ length: count }, (_, i) => makeEvent(i));
}

describe('ReplayEngine', () => {
  let engine: ReplayEngine;

  beforeEach(() => {
    engine = new ReplayEngine();
  });

  afterEach(() => {
    engine.stop();
  });

  describe('loading events', () => {
    it('should load events and report total count', () => {
      engine.loadEvents(makeEventLog(100));
      expect(engine.getState().totalEvents).toBe(100);
      expect(engine.getState().currentIndex).toBe(0);
    });

    it('should parse JSONL string into events', () => {
      const events = makeEventLog(5);
      const jsonl = events.map(e => JSON.stringify(e)).join('\n');
      engine.loadFromJSONL(jsonl);
      expect(engine.getState().totalEvents).toBe(5);
    });

    it('should reject empty event log', () => {
      expect(() => engine.loadEvents([])).toThrow('Cannot replay empty event log');
    });
  });

  describe('state reconstruction', () => {
    it('should reconstruct state at a given event index', () => {
      engine.loadEvents(makeEventLog(10));
      const state = engine.reconstructStateAt(5);
      expect(state.processedEvents).toBe(5);
      expect(state.agents.size).toBeGreaterThanOrEqual(0);
    });

    it('should return empty state at index 0', () => {
      engine.loadEvents(makeEventLog(10));
      const state = engine.reconstructStateAt(0);
      expect(state.processedEvents).toBe(0);
    });

    it('should process all events at max index', () => {
      engine.loadEvents(makeEventLog(10));
      const state = engine.reconstructStateAt(10);
      expect(state.processedEvents).toBe(10);
    });
  });

  describe('snapshots', () => {
    it('should create snapshots every 500 events', () => {
      engine.loadEvents(makeEventLog(1200));
      const snapshots = engine.getSnapshots();
      expect(snapshots.length).toBe(2); // at 500 and 1000
    });

    it('should use nearest snapshot for fast seeking', () => {
      const events = makeEventLog(1200);
      engine.loadEvents(events);

      const reconstructSpy = vi.fn();
      engine.onEventProcessed(reconstructSpy);

      // Seeking to index 520 should use snapshot at 500, only process 20 events
      engine.seekTo(520);
      expect(reconstructSpy).toHaveBeenCalledTimes(20);
    });

    it('should not create snapshots for small event logs', () => {
      engine.loadEvents(makeEventLog(100));
      expect(engine.getSnapshots()).toHaveLength(0);
    });
  });

  describe('playback controls', () => {
    it('should start playback and set isPlaying to true', () => {
      engine.loadEvents(makeEventLog(10));
      engine.play();
      expect(engine.getState().isPlaying).toBe(true);
    });

    it('should pause playback', () => {
      engine.loadEvents(makeEventLog(10));
      engine.play();
      engine.pause();
      expect(engine.getState().isPlaying).toBe(false);
    });

    it('should set playback speed between 0.5x and 4x', () => {
      engine.loadEvents(makeEventLog(10));
      engine.setSpeed(2.0);
      expect(engine.getState().speed).toBe(2.0);
    });

    it('should clamp speed to valid range', () => {
      engine.loadEvents(makeEventLog(10));
      engine.setSpeed(0.1);
      expect(engine.getState().speed).toBe(0.5);
      engine.setSpeed(10);
      expect(engine.getState().speed).toBe(4.0);
    });

    it('should seek to a specific event index', () => {
      engine.loadEvents(makeEventLog(100));
      engine.seekTo(50);
      expect(engine.getState().currentIndex).toBe(50);
    });

    it('should clamp seek index to valid range', () => {
      engine.loadEvents(makeEventLog(100));
      engine.seekTo(-5);
      expect(engine.getState().currentIndex).toBe(0);
      engine.seekTo(200);
      expect(engine.getState().currentIndex).toBe(100);
    });
  });

  describe('isReplaying flag', () => {
    it('should set isReplaying to true when events are loaded', () => {
      engine.loadEvents(makeEventLog(10));
      expect(engine.getState().isReplaying).toBe(true);
    });

    it('should set isReplaying to false when stopped', () => {
      engine.loadEvents(makeEventLog(10));
      engine.stop();
      expect(engine.getState().isReplaying).toBe(false);
    });
  });

  describe('speed-adjusted timing', () => {
    it('should emit events faster at 2x speed', () => {
      engine.loadEvents(makeEventLog(10));
      engine.setSpeed(2.0);

      // At 2x speed, a 1s gap between events should fire at 0.5s intervals
      const timing = engine.getEventTimingAt(1);
      expect(timing.adjustedDelayMs).toBe(timing.originalDelayMs / 2);
    });

    it('should emit events slower at 0.5x speed', () => {
      engine.loadEvents(makeEventLog(10));
      engine.setSpeed(0.5);

      const timing = engine.getEventTimingAt(1);
      expect(timing.adjustedDelayMs).toBe(timing.originalDelayMs * 2);
    });
  });
});
