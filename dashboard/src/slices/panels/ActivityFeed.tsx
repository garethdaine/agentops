'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getAgentColor } from '@/lib/avatar-animations';

// ── Types ──────────────────────────────────────────────────────────────

/** A single entry in the activity feed. */
export interface FeedEntry {
  ts: string;
  agentName: string;
  agentType: string;
  tool: string;
  filePath?: string;
  status: 'success' | 'failure' | 'pending' | string;
  sessionId: string;
  event: string;
}

/** Maximum number of events kept in the feed. */
export const MAX_FEED_ENTRIES = 500;

// ── Pure helpers ───────────────────────────────────────────────────────

/** Merge events from all sessions, sort by timestamp, and cap at MAX_FEED_ENTRIES. */
export function mergeAndSortEvents(
  eventsMap: Map<string, Array<Record<string, unknown>>>,
): Array<Record<string, unknown>> {
  const all: Array<Record<string, unknown>> = [];
  for (const entries of eventsMap.values()) {
    all.push(...entries);
  }
  all.sort((a, b) =>
    String(a.ts ?? '').localeCompare(String(b.ts ?? '')),
  );
  if (all.length <= MAX_FEED_ENTRIES) return all;
  return all.slice(all.length - MAX_FEED_ENTRIES);
}

/** Returns true when the scroll container is near the bottom. */
export function shouldAutoScroll(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold: number,
): boolean {
  return scrollTop + clientHeight >= scrollHeight - threshold;
}

/** Creates a simple collapse-state object (framework-agnostic for testability). */
export function createFeedState() {
  const state = {
    isCollapsed: false,
    toggle() {
      state.isCollapsed = !state.isCollapsed;
    },
  };
  return state;
}

// ── Sub-components ─────────────────────────────────────────────────────

interface FeedEntryRowProps {
  entry: FeedEntry;
}

/** Renders a single row in the activity feed. */
function FeedEntryRow({ entry }: FeedEntryRowProps) {
  const color = getAgentColor(entry.agentType);
  const time = formatTime(entry.ts);
  return (
    <div className="flex items-start gap-2 px-2 py-1 text-xs border-b border-gray-800 hover:bg-gray-800/50">
      <span className="text-gray-500 shrink-0 w-16">{time}</span>
      <span
        className="shrink-0 rounded px-1 font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {entry.agentName}
      </span>
      <span className="text-gray-300 truncate">
        {entry.tool}
        {entry.filePath ? ` → ${entry.filePath}` : ''}
      </span>
      <span className="ml-auto shrink-0">{renderStatusIcon(entry.status)}</span>
    </div>
  );
}

/** Format ISO timestamp to HH:MM:SS. */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(11, 19);
  } catch {
    return '--:--:--';
  }
}

/** Return a status indicator character. */
function renderStatusIcon(status: string): string {
  if (status === 'success') return '✓';
  if (status === 'failure') return '✗';
  if (status === 'pending') return '⋯';
  return '·';
}

// ── Main component ─────────────────────────────────────────────────────

/** Collapsible activity feed sidebar showing merged events across sessions. */
export default function ActivityFeed() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Placeholder: in real usage this would come from useOfficeStore / useAgentStore
  const entries: FeedEntry[] = [];

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    autoScrollRef.current = shouldAutoScroll(
      el.scrollTop,
      el.clientHeight,
      el.scrollHeight,
      10,
    );
  }, []);

  useEffect(() => {
    if (!autoScrollRef.current) return;
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  if (isCollapsed) {
    return (
      <div className="w-8 bg-gray-900 border-l border-gray-700 flex flex-col items-center pt-2">
        <button
          onClick={toggleCollapse}
          className="text-gray-400 hover:text-white text-xs"
          aria-label="Expand activity feed"
        >
          ◀
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-300">Activity Feed</span>
        <button
          onClick={toggleCollapse}
          className="text-gray-400 hover:text-white text-xs"
          aria-label="Collapse activity feed"
        >
          ▶
        </button>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {entries.length === 0 ? (
          <div className="text-gray-500 text-xs text-center py-4">No events yet</div>
        ) : (
          entries.map((entry, i) => (
            <FeedEntryRow key={`${entry.ts}-${i}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
