import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClientTracker,
  shouldAutoOpenBrowser,
} from '../client-tracker';

describe('Relay Client Tracking', () => {
  describe('ClientTracker', () => {
    let tracker: ClientTracker;

    beforeEach(() => {
      tracker = new ClientTracker();
    });

    it('should start with zero connected clients', () => {
      expect(tracker.getConnectedCount()).toBe(0);
    });

    it('should increment count on client connect', () => {
      tracker.onConnect('client-1');
      expect(tracker.getConnectedCount()).toBe(1);
    });

    it('should decrement count on client disconnect', () => {
      tracker.onConnect('client-1');
      tracker.onDisconnect('client-1');
      expect(tracker.getConnectedCount()).toBe(0);
    });

    it('should track multiple clients independently', () => {
      tracker.onConnect('client-1');
      tracker.onConnect('client-2');
      expect(tracker.getConnectedCount()).toBe(2);

      tracker.onDisconnect('client-1');
      expect(tracker.getConnectedCount()).toBe(1);
    });

    it('should not go negative on unexpected disconnect', () => {
      tracker.onDisconnect('unknown');
      expect(tracker.getConnectedCount()).toBe(0);
    });

    it('should report hasConnectedClients correctly', () => {
      expect(tracker.hasConnectedClients()).toBe(false);
      tracker.onConnect('client-1');
      expect(tracker.hasConnectedClients()).toBe(true);
    });
  });

  describe('shouldAutoOpenBrowser', () => {
    it('should return true when no clients connected and first session', () => {
      expect(shouldAutoOpenBrowser(0, true)).toBe(true);
    });

    it('should return false when clients already connected', () => {
      expect(shouldAutoOpenBrowser(1, true)).toBe(false);
    });

    it('should return false when not the first session start', () => {
      expect(shouldAutoOpenBrowser(0, false)).toBe(false);
    });

    it('should return false when clients connected even on first session', () => {
      expect(shouldAutoOpenBrowser(2, true)).toBe(false);
    });
  });
});
