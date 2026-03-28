/** Default throttle window in milliseconds. */
export const THROTTLE_MS = 100;

export interface EventBatcherOptions {
  /** Milliseconds to buffer events before flushing. */
  throttleMs: number;
}

export interface EventBatcher<T> {
  /** Add an event to the buffer. Schedules a flush if none is pending. */
  push(event: T): void;
  /** Flush remaining buffered events synchronously and cancel pending timers. */
  destroy(): void;
}

/**
 * Create an event batcher that coalesces events within a throttle window
 * and flushes them via requestAnimationFrame to avoid layout thrashing.
 */
export function createEventBatcher<T>(
  flushFn: (events: T[]) => void,
  options: EventBatcherOptions,
): EventBatcher<T> {
  const { throttleMs } = options;
  let buffer: T[] = [];
  let timerId: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (timerId !== null) return;
    timerId = setTimeout(() => {
      timerId = null;
      if (buffer.length === 0) return;
      requestAnimationFrame(() => {
        flushBuffer();
      });
    }, throttleMs);
  }

  function flushBuffer(): void {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    flushFn(batch);
  }

  function push(event: T): void {
    buffer.push(event);
    scheduleFlush();
  }

  function destroy(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    flushBuffer();
  }

  return { push, destroy };
}
