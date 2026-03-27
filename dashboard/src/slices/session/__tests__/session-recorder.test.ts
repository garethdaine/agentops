import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SessionRecorder,
  type RecordedEvent,
  type RecordingState,
} from '../session-recorder';

describe('SessionRecorder', () => {
  let recorder: SessionRecorder;

  beforeEach(() => {
    recorder = new SessionRecorder();
  });

  afterEach(() => {
    recorder.stop();
  });

  describe('recording lifecycle', () => {
    it('should start recording and set isRecording to true', () => {
      const recordingId = recorder.start();
      expect(recorder.getState().isRecording).toBe(true);
      expect(recordingId).toMatch(/^rec-/);
    });

    it('should stop recording and set isRecording to false', () => {
      recorder.start();
      recorder.stop();
      expect(recorder.getState().isRecording).toBe(false);
    });

    it('should not record events when not recording', () => {
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      expect(recorder.getState().eventCount).toBe(0);
    });

    it('should generate unique recording IDs for each start', () => {
      const id1 = recorder.start();
      recorder.stop();
      const id2 = recorder.start();
      expect(id1).not.toBe(id2);
    });
  });

  describe('event appending', () => {
    it('should append events with recording timestamps', () => {
      recorder.start();
      const before = Date.now();
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      const after = Date.now();

      const state = recorder.getState();
      expect(state.eventCount).toBe(1);

      const events = recorder.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].originalTs).toBe('2026-03-26T10:00:00Z');
      expect(new Date(events[0].recordedAt).getTime()).toBeGreaterThanOrEqual(before);
      expect(new Date(events[0].recordedAt).getTime()).toBeLessThanOrEqual(after);
    });

    it('should preserve original event data in recorded event', () => {
      recorder.start();
      const original = { event: 'PostToolUse' as const, session: 's1', tool: 'Write', ts: '2026-03-26T10:00:01Z', cwd: '/project' };
      recorder.appendEvent(original);

      const events = recorder.getEvents();
      expect(events[0].payload).toEqual(original);
    });

    it('should append multiple events in order', () => {
      recorder.start();
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      recorder.appendEvent({ event: 'PostToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:01Z', cwd: '/tmp' });
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Write', ts: '2026-03-26T10:00:02Z', cwd: '/tmp' });

      const events = recorder.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].payload.tool).toBe('Read');
      expect(events[2].payload.tool).toBe('Write');
    });
  });

  describe('JSONL export', () => {
    it('should export events as valid JSONL', () => {
      recorder.start();
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      recorder.appendEvent({ event: 'PostToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:01Z', cwd: '/tmp' });

      const jsonl = recorder.exportJSONL();
      const lines = jsonl.trim().split('\n');
      expect(lines).toHaveLength(2);

      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('recordedAt');
        expect(parsed).toHaveProperty('originalTs');
        expect(parsed).toHaveProperty('payload');
      }
    });

    it('should return empty string when no events recorded', () => {
      recorder.start();
      expect(recorder.exportJSONL()).toBe('');
    });
  });

  describe('state reporting', () => {
    it('should report correct event count during recording', () => {
      recorder.start();
      expect(recorder.getState().eventCount).toBe(0);

      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      expect(recorder.getState().eventCount).toBe(1);

      recorder.appendEvent({ event: 'PostToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:01Z', cwd: '/tmp' });
      expect(recorder.getState().eventCount).toBe(2);
    });

    it('should preserve events after stop for export', () => {
      recorder.start();
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      recorder.stop();

      expect(recorder.getEvents()).toHaveLength(1);
      expect(recorder.exportJSONL()).not.toBe('');
    });

    it('should clear events on new recording start', () => {
      recorder.start();
      recorder.appendEvent({ event: 'PreToolUse', session: 's1', tool: 'Read', ts: '2026-03-26T10:00:00Z', cwd: '/tmp' });
      recorder.stop();
      recorder.start();

      expect(recorder.getState().eventCount).toBe(0);
      expect(recorder.getEvents()).toHaveLength(0);
    });
  });
});
