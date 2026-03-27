import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCommand,
  serializeCommand,
  parseAck,
  CommandTracker,
  type Command,
  type CommandAck,
  type CommandType,
} from '../control-protocol';

describe('Control Protocol', () => {
  describe('createCommand', () => {
    it('should create a command with unique correlation ID', () => {
      const cmd = createCommand('pause', 'session-123');
      expect(cmd.id).toMatch(/^cmd-/);
      expect(cmd.type).toBe('command');
      expect(cmd.command).toBe('pause');
      expect(cmd.target).toBe('session-123');
    });

    it('should generate unique IDs for each command', () => {
      const cmd1 = createCommand('pause', 'session-123');
      const cmd2 = createCommand('pause', 'session-123');
      expect(cmd1.id).not.toBe(cmd2.id);
    });

    it('should accept valid command types', () => {
      const commands: CommandType[] = ['pause', 'resume', 'cancel'];
      for (const type of commands) {
        const cmd = createCommand(type, 'target-1');
        expect(cmd.command).toBe(type);
      }
    });
  });

  describe('serializeCommand', () => {
    it('should serialize command to JSON string', () => {
      const cmd = createCommand('pause', 'session-123');
      const json = serializeCommand(cmd);
      const parsed = JSON.parse(json);
      expect(parsed.type).toBe('command');
      expect(parsed.command).toBe('pause');
      expect(parsed.target).toBe('session-123');
      expect(parsed.id).toBe(cmd.id);
    });
  });

  describe('parseAck', () => {
    it('should parse a valid command-ack message', () => {
      const raw = JSON.stringify({
        type: 'command-ack',
        id: 'cmd-123',
        status: 'accepted',
      });
      const ack = parseAck(raw);
      expect(ack).not.toBeNull();
      expect(ack!.id).toBe('cmd-123');
      expect(ack!.status).toBe('accepted');
    });

    it('should return null for non-ack messages', () => {
      const raw = JSON.stringify({ type: 'telemetry', payload: {} });
      expect(parseAck(raw)).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      expect(parseAck('{broken')).toBeNull();
    });

    it('should parse rejected ack with reason', () => {
      const raw = JSON.stringify({
        type: 'command-ack',
        id: 'cmd-456',
        status: 'rejected',
        reason: 'session not found',
      });
      const ack = parseAck(raw);
      expect(ack!.status).toBe('rejected');
      expect(ack!.reason).toBe('session not found');
    });
  });

  describe('CommandTracker', () => {
    let tracker: CommandTracker;

    beforeEach(() => {
      vi.useFakeTimers();
      tracker = new CommandTracker({ timeoutMs: 5000 });
    });

    afterEach(() => {
      tracker.dispose();
      vi.useRealTimers();
    });

    it('should track a pending command', () => {
      const cmd = createCommand('pause', 'session-1');
      tracker.track(cmd);
      expect(tracker.getPending()).toHaveLength(1);
      expect(tracker.getPending()[0].id).toBe(cmd.id);
    });

    it('should resolve command on ack received', () => {
      const cmd = createCommand('pause', 'session-1');
      const onResolve = vi.fn();
      tracker.track(cmd, { onResolve });

      tracker.handleAck({ id: cmd.id, status: 'accepted' });
      expect(onResolve).toHaveBeenCalledWith({ id: cmd.id, status: 'accepted' });
      expect(tracker.getPending()).toHaveLength(0);
    });

    it('should timeout after 5 seconds with no ack', () => {
      const cmd = createCommand('pause', 'session-1');
      const onTimeout = vi.fn();
      tracker.track(cmd, { onTimeout });

      vi.advanceTimersByTime(5000);
      expect(onTimeout).toHaveBeenCalledWith(cmd.id);
      expect(tracker.getPending()).toHaveLength(0);
    });

    it('should not timeout if ack received before deadline', () => {
      const cmd = createCommand('pause', 'session-1');
      const onTimeout = vi.fn();
      tracker.track(cmd, { onTimeout });

      vi.advanceTimersByTime(3000);
      tracker.handleAck({ id: cmd.id, status: 'accepted' });
      vi.advanceTimersByTime(3000);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('should handle duplicate commands idempotently', () => {
      const cmd = createCommand('pause', 'session-1');
      tracker.track(cmd);
      tracker.track(cmd); // duplicate
      expect(tracker.getPending()).toHaveLength(1);
    });

    it('should ignore acks for unknown command IDs', () => {
      expect(() => {
        tracker.handleAck({ id: 'cmd-unknown', status: 'accepted' });
      }).not.toThrow();
    });

    it('should dispose all pending timeouts', () => {
      const cmd1 = createCommand('pause', 'session-1');
      const cmd2 = createCommand('resume', 'session-2');
      const onTimeout = vi.fn();
      tracker.track(cmd1, { onTimeout });
      tracker.track(cmd2, { onTimeout });

      tracker.dispose();
      vi.advanceTimersByTime(10000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
