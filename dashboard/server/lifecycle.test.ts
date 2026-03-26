import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock session-registry so we avoid real I/O during fake timer tests
vi.mock('./session-registry', () => ({
  readSessionRegistry: vi.fn(),
}));

import { IdleDetector, cleanupPidFile } from './lifecycle';
import { readSessionRegistry } from './session-registry';

const mockReadRegistry = vi.mocked(readSessionRegistry);

describe('IdleDetector', () => {
  let tmpDir: string;
  let pidFilePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifecycle-test-'));
    pidFilePath = path.join(tmpDir, 'dashboard.pid');
    vi.useFakeTimers();
    mockReadRegistry.mockReset();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should trigger shutdown after idle timeout with no active sessions', async () => {
    // No active sessions
    mockReadRegistry.mockResolvedValue([]);

    const shutdownFn = vi.fn();
    const detector = new IdleDetector({
      registryPath: '/fake/path',
      idleTimeoutMs: 200,
      checkIntervalMs: 100,
    });
    detector.onShutdown(shutdownFn);
    detector.start();

    // At 100ms: first check, sets idleSince
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 200ms: elapsed=100 < 200
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 300ms: elapsed=200 >= 200 -> shutdown
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).toHaveBeenCalledTimes(1);

    detector.stop();
  });

  it('should prevent shutdown while sessions are active', async () => {
    // Always return an active session
    mockReadRegistry.mockResolvedValue([
      { session_id: 'sess-001', project_dir: '/p/a', started_at: new Date().toISOString(), pid: 123, stale: false },
    ]);

    const shutdownFn = vi.fn();
    const detector = new IdleDetector({
      registryPath: '/fake/path',
      idleTimeoutMs: 200,
      checkIntervalMs: 100,
    });
    detector.onShutdown(shutdownFn);
    detector.start();

    // Advance well past timeout
    await vi.advanceTimersByTimeAsync(1000);

    expect(shutdownFn).not.toHaveBeenCalled();
    detector.stop();
  });

  it('should check registry periodically', async () => {
    // Start with active session, then switch to empty
    mockReadRegistry
      .mockResolvedValueOnce([
        { session_id: 'sess-001', project_dir: '/p/a', started_at: new Date().toISOString(), pid: 123, stale: false },
      ])
      .mockResolvedValue([]); // all subsequent calls return empty

    const shutdownFn = vi.fn();
    const detector = new IdleDetector({
      registryPath: '/fake/path',
      idleTimeoutMs: 200,
      checkIntervalMs: 100,
    });
    detector.onShutdown(shutdownFn);
    detector.start();

    // At 100ms: check #1, active session -> idleSince stays null
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 200ms: check #2, no sessions -> sets idleSince
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 300ms: check #3, elapsed=100 < 200
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 400ms: check #4, elapsed=200 >= 200 -> shutdown
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).toHaveBeenCalledTimes(1);

    detector.stop();
  });

  it('should reset idle timer when sessions become active again', async () => {
    mockReadRegistry
      .mockResolvedValueOnce([]) // check #1: idle
      .mockResolvedValueOnce([]) // check #2: idle
      .mockResolvedValueOnce([ // check #3: active again!
        { session_id: 'sess-001', project_dir: '/p/a', started_at: new Date().toISOString(), pid: 123, stale: false },
      ])
      .mockResolvedValue([]); // check #4+: idle again

    const shutdownFn = vi.fn();
    const detector = new IdleDetector({
      registryPath: '/fake/path',
      idleTimeoutMs: 200,
      checkIntervalMs: 100,
    });
    detector.onShutdown(shutdownFn);
    detector.start();

    // At 100ms: check #1, no sessions, sets idleSince
    // At 200ms: check #2, elapsed=100 < 200
    await vi.advanceTimersByTimeAsync(200);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 300ms: check #3, active session -> resets idleSince to null
    await vi.advanceTimersByTimeAsync(100);
    expect(shutdownFn).not.toHaveBeenCalled();

    // At 400ms: check #4, no sessions, sets idleSince again
    // At 500ms: check #5, elapsed=100 < 200
    // At 600ms: check #6, elapsed=200 >= 200 -> shutdown
    await vi.advanceTimersByTimeAsync(300);
    expect(shutdownFn).toHaveBeenCalledTimes(1);

    detector.stop();
  });

  it('should stop checking after stop() is called', async () => {
    mockReadRegistry.mockResolvedValue([]);

    const shutdownFn = vi.fn();
    const detector = new IdleDetector({
      registryPath: '/fake/path',
      idleTimeoutMs: 200,
      checkIntervalMs: 100,
    });
    detector.onShutdown(shutdownFn);
    detector.start();
    detector.stop();

    await vi.advanceTimersByTimeAsync(1000);
    expect(shutdownFn).not.toHaveBeenCalled();
  });

  it('should clean up PID file via cleanupPidFile', async () => {
    vi.useRealTimers(); // need real timers for fs ops
    await fs.writeFile(pidFilePath, '12345');

    await cleanupPidFile(pidFilePath);

    await expect(fs.access(pidFilePath)).rejects.toThrow();
  });

  it('should not throw if PID file does not exist', async () => {
    vi.useRealTimers();
    await expect(cleanupPidFile(path.join(tmpDir, 'nonexistent.pid'))).resolves.toBeUndefined();
  });
});
