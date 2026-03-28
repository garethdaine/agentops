import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('EventBatcher', () => {
  let batcher: typeof import('@/lib/event-batcher');

  beforeEach(async () => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame to fire synchronously
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    batcher = await import('@/lib/event-batcher');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should batch 50 events sent in 50ms into a single flush', () => {
    const flushSpy = vi.fn();
    const b = batcher.createEventBatcher(flushSpy, { throttleMs: 100 });

    for (let i = 0; i < 50; i++) {
      b.push({
        ts: `2026-03-26T00:00:00.${String(i).padStart(3, '0')}Z`,
        event: 'PostToolUse',
        session: 'sess-1',
        tool: `Tool-${i}`,
        cwd: '/project',
      });
      vi.advanceTimersByTime(1); // 1ms between each
    }

    // At 50ms, throttle not yet elapsed -- no flush yet
    expect(flushSpy).not.toHaveBeenCalled();

    // Advance to 100ms mark
    vi.advanceTimersByTime(50);

    // Should have flushed exactly once with all 50 events
    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(flushSpy.mock.calls[0][0]).toHaveLength(50);
    expect(flushSpy.mock.calls[0][0][0].tool).toBe('Tool-0');
    expect(flushSpy.mock.calls[0][0][49].tool).toBe('Tool-49');
  });

  it('should flush remaining events when destroy is called', () => {
    const flushSpy = vi.fn();
    const b = batcher.createEventBatcher(flushSpy, { throttleMs: 100 });

    b.push({ ts: '', event: 'Test', session: 's1', tool: 'X', cwd: '/' });
    b.destroy();

    expect(flushSpy).toHaveBeenCalledTimes(1);
    expect(flushSpy.mock.calls[0][0]).toHaveLength(1);
  });

  it('should not flush when buffer is empty at throttle boundary', () => {
    const flushSpy = vi.fn();
    batcher.createEventBatcher(flushSpy, { throttleMs: 100 });

    vi.advanceTimersByTime(200);
    expect(flushSpy).not.toHaveBeenCalled();
  });

  it('should handle multiple flush cycles', () => {
    const flushSpy = vi.fn();
    const b = batcher.createEventBatcher(flushSpy, { throttleMs: 100 });

    // First batch
    b.push({ ts: '', event: 'A', session: 's1', tool: 'T1', cwd: '/' });
    vi.advanceTimersByTime(100);
    expect(flushSpy).toHaveBeenCalledTimes(1);

    // Second batch
    b.push({ ts: '', event: 'B', session: 's1', tool: 'T2', cwd: '/' });
    vi.advanceTimersByTime(100);
    expect(flushSpy).toHaveBeenCalledTimes(2);
    expect(flushSpy.mock.calls[1][0][0].tool).toBe('T2');
  });

  it('should gate flush through requestAnimationFrame', () => {
    const rafSpy = vi.fn((cb: FrameRequestCallback) => { cb(0); return 1; });
    vi.stubGlobal('requestAnimationFrame', rafSpy);

    const flushSpy = vi.fn();
    const b = batcher.createEventBatcher(flushSpy, { throttleMs: 100 });

    b.push({ ts: '', event: 'X', session: 's1', tool: 'T', cwd: '/' });
    vi.advanceTimersByTime(100);

    expect(rafSpy).toHaveBeenCalled();
    expect(flushSpy).toHaveBeenCalledTimes(1);
  });
});
