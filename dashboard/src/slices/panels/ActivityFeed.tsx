'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { getAgentColor } from '@/lib/avatar-animations';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

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
        {entry.filePath ? ` \u2192 ${entry.filePath}` : ''}
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
  if (status === 'success') return '\u2713';
  if (status === 'failure') return '\u2717';
  if (status === 'pending') return '\u22EF';
  return '\u00B7';
}

// ── Main component ─────────────────────────────────────────────────────

interface ActivityFeedProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Activity feed rendered as a Shadcn Sheet slide-in panel. */
export default function ActivityFeed({ open = false, onOpenChange }: ActivityFeedProps) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[360px] bg-gray-900/95 border-gray-700 text-gray-100"
      >
        <SheetHeader>
          <SheetTitle className="text-gray-100">Activity Feed</SheetTitle>
          <SheetDescription className="text-gray-400">Real-time event stream from all sessions</SheetDescription>
        </SheetHeader>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-2"
        >
          {entries.length === 0 ? (
            <div className="text-gray-500 text-xs text-center py-4">No events yet</div>
          ) : (
            entries.map((entry, i) => (
              <FeedEntryRow key={`${entry.ts}-${i}`} entry={entry} />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
