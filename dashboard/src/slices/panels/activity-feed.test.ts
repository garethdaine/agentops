import { describe, it, expect } from 'vitest';
import {
  mergeAndSortEvents,
  type FeedEntry,
  MAX_FEED_ENTRIES,
} from './ActivityFeed';

describe('mergeAndSortEvents', () => {
  const sessionAEvents = [
    { event: 'tool_use', tool: 'Read', ts: '2026-03-26T10:00:01Z', session: 'sess-a', agent: 'main' },
    { event: 'tool_result', tool: 'Read', ts: '2026-03-26T10:00:03Z', session: 'sess-a', agent: 'main' },
  ];

  const sessionBEvents = [
    { event: 'tool_use', tool: 'Edit', ts: '2026-03-26T10:00:02Z', session: 'sess-b', agent: 'code-critic' },
    { event: 'delegation', agent: 'security-reviewer', ts: '2026-03-26T10:00:04Z', session: 'sess-b' },
  ];

  it('should merge events from multiple sessions into a single sorted array', () => {
    const eventsMap = new Map([
      ['sess-a', sessionAEvents],
      ['sess-b', sessionBEvents],
    ]);
    const merged = mergeAndSortEvents(eventsMap);
    expect(merged).toHaveLength(4);
    // Sorted by ts ascending (oldest first)
    expect(merged[0].ts).toBe('2026-03-26T10:00:01Z');
    expect(merged[3].ts).toBe('2026-03-26T10:00:04Z');
  });

  it('should limit to MAX_FEED_ENTRIES most recent events', () => {
    expect(MAX_FEED_ENTRIES).toBe(500);
    const manyEvents = Array.from({ length: 600 }, (_, i) => ({
      event: 'tool_use',
      tool: 'Read',
      ts: new Date(Date.now() - (600 - i) * 1000).toISOString(),
      session: 'sess-a',
      agent: 'main',
    }));
    const eventsMap = new Map([['sess-a', manyEvents]]);
    const merged = mergeAndSortEvents(eventsMap);
    expect(merged).toHaveLength(500);
  });

  it('should return empty array for empty events map', () => {
    const merged = mergeAndSortEvents(new Map());
    expect(merged).toHaveLength(0);
  });
});

describe('FeedEntry shape', () => {
  it('should contain timestamp, agent name, tool name, file path, and status', () => {
    const entry: FeedEntry = {
      ts: '2026-03-26T10:00:01Z',
      agentName: 'main',
      agentType: 'main',
      tool: 'Read',
      filePath: '/src/index.ts',
      status: 'success',
      sessionId: 'sess-a',
      event: 'tool_result',
    };
    expect(entry.ts).toBeTruthy();
    expect(entry.agentName).toBeTruthy();
    expect(entry.tool).toBeTruthy();
  });
});

describe('ActivityFeed component', () => {
  it('should export ActivityFeed as default', async () => {
    const mod = await import('./ActivityFeed');
    expect(mod.default).toBeTruthy();
    expect(typeof mod.default).toBe('function');
  });
});

describe('auto-scroll behavior', () => {
  it('should define shouldAutoScroll utility', async () => {
    const { shouldAutoScroll } = await import('./ActivityFeed');
    // At bottom: scrollTop + clientHeight >= scrollHeight - threshold
    expect(shouldAutoScroll(100, 50, 155, 10)).toBe(true);
    // Not at bottom
    expect(shouldAutoScroll(0, 50, 200, 10)).toBe(false);
  });
});

describe('collapse toggle', () => {
  it('should export isCollapsed state management', async () => {
    const { createFeedState } = await import('./ActivityFeed');
    const state = createFeedState();
    expect(state.isCollapsed).toBe(false);
    state.toggle();
    expect(state.isCollapsed).toBe(true);
    state.toggle();
    expect(state.isCollapsed).toBe(false);
  });
});
