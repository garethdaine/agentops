'use client';

import React, { useMemo } from 'react';
import { useStore } from 'zustand';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useOfficeStore } from '@/stores/office-store';
import { useAgentStore } from '@/stores/agent-store';
import type { AgentState } from '@/stores/agent-store';

const EMPTY_EVENTS: EventEntryData[] = [];
import ControlPanel from '@/slices/control/ControlPanel';
import type { AgentStatus } from '@/types/agent';

interface EventEntryData {
  event: string;
  tool?: string;
  ts: string;
  session: string;
  content?: string;
  toolInput?: string;
  agentId?: string;
}

/** Extract a human-readable summary from an event */
function summarize(entry: EventEntryData): string | null {
  // For Notifications, show the message text
  if (entry.event === 'Notification') {
    const c = entry.content || '';
    return c.length > 0 ? c : null;
  }

  // Prefer toolInput (the cleaned summary from the hook)
  const input = entry.toolInput || '';
  if (input && input !== '{}' && input !== '""' && input.length > 2) {
    // If it starts with $ or / it's already a readable summary
    if (input.startsWith('$') || input.startsWith('/') || !input.startsWith('{')) {
      return input;
    }
    // Try to extract a readable part from JSON
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'string') return parsed;
      if (parsed.command) return `$ ${parsed.command}`;
      if (parsed.file_path) return parsed.file_path.split('/').pop();
      if (parsed.pattern) return `/${parsed.pattern}/`;
      return null;
    } catch {
      return input.length > 2 ? input : null;
    }
  }

  // Fallback: try to extract from content (old events)
  const content = entry.content || '';
  if (content && content.length > 2) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.filePath) return parsed.filePath.split('/').pop();
      if (parsed.command) return `$ ${parsed.command}`;
      return null; // Don't show raw JSON
    } catch {
      return content.startsWith('{') ? null : content.slice(0, 100);
    }
  }

  return null;
}

function EventEntry({ entry }: { entry: EventEntryData }) {
  const time = new Date(entry.ts).toLocaleTimeString();
  const summary = summarize(entry);
  return (
    <div data-testid="event-entry" className="py-2 px-3 text-xs border-b border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-gray-500">{time}</span>
        <div className="flex items-center gap-2">
          {entry.tool && <span className="font-mono text-gray-300">{entry.tool}</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            entry.event === 'Notification' ? 'bg-indigo-500/20 text-indigo-300' :
            entry.event === 'PostToolUse' ? 'bg-emerald-500/20 text-emerald-300' :
            entry.event === 'PreToolUse' ? 'bg-blue-500/20 text-blue-300' :
            'bg-gray-700 text-gray-400'
          }`}>{entry.event}</span>
        </div>
      </div>
      {summary && (
        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed line-clamp-2 font-mono whitespace-pre-wrap">
          {summary}
        </p>
      )}
    </div>
  );
}

function ToolHistoryEntry({ tool }: { tool: string }) {
  return (
    <div data-testid="tool-entry" className="py-1 px-2 text-sm border-b border-border/50">
      <span className="font-mono">{tool}</span>
    </div>
  );
}

function renderOverviewTab(agent: AgentState) {
  return (
    <div className="space-y-3 p-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Name</span>
        <span>{agent.name}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Type</span>
        <span>{agent.type}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Status</span>
        <span>{agent.status}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Tool</span>
        <span>{agent.currentTool || 'none'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Session</span>
        <span>{agent.session_id}</span>
      </div>
    </div>
  );
}

function renderEventsTab(events: EventEntryData[]) {
  // Filter to tool events only (Notifications go to Messages tab)
  const toolEvents = events.filter((e) => {
    if (e.event === 'PreToolUse' || e.event === 'PostToolUse') return !!e.tool;
    return false;
  });
  const limited = toolEvents.slice(-100);
  return (
    <div className="overflow-y-auto max-h-[60vh]">
      {limited.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-8">No events yet</div>
      ) : (
        limited.map((entry, i) => (
          <EventEntry key={`${entry.ts}-${i}`} entry={entry} />
        ))
      )}
    </div>
  );
}

function renderMessagesTab(events: EventEntryData[]) {
  const messages = events.filter((e) => (e.event === 'Notification' || e.event === 'AssistantMessage') && e.content && e.content.length > 0);
  const limited = messages.slice(-50);
  return (
    <div className="overflow-y-auto max-h-[60vh]">
      {limited.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-8">No messages yet</div>
      ) : (
        limited.map((msg, i) => {
          const time = new Date(msg.ts).toLocaleTimeString();
          return (
            <div key={`${msg.ts}-${i}`} className="py-3 px-3 border-b border-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500">{time}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">Response</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function renderToolsTab(events: EventEntryData[]) {
  const uniqueTools = [...new Set(events.map((e) => e.tool).filter(Boolean))] as string[];
  return (
    <div className="space-y-1">
      {uniqueTools.map((tool) => (
        <ToolHistoryEntry key={tool} tool={tool} />
      ))}
    </div>
  );
}

export default function AgentDetailPanel() {
  const selectedAgentId = useStore(useOfficeStore, (s) => s.selectedAgent);
  const detailPanelOpen = useStore(useOfficeStore, (s) => s.detailPanelOpen);
  const setDetailPanelOpen = useStore(useOfficeStore, (s) => s.setDetailPanelOpen);

  const agent = useStore(useAgentStore, (s) =>
    s.activeAgents.find((a: AgentState) => a.session_id === selectedAgentId),
  );
  const rawEvents = useStore(useAgentStore, (s) =>
    selectedAgentId ? (s.recentEvents.get(selectedAgentId) ?? EMPTY_EVENTS) : EMPTY_EVENTS,
  );

  const events = rawEvents as EventEntryData[];

  if (!detailPanelOpen) return null;

  return (
    <div className="absolute top-2 -right-3 bottom-12 w-[380px] z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{agent?.name ?? 'Agent'}</h2>
          <p className="text-xs text-gray-400">{agent?.type ?? ''}</p>
        </div>
        <button
          onClick={() => setDetailPanelOpen(false)}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          aria-label="Close panel"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {agent && (
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="px-4 pt-2">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {renderOverviewTab(agent)}
            </TabsContent>

            <TabsContent value="messages">
              {renderMessagesTab(events)}
            </TabsContent>

            <TabsContent value="events">
              {renderEventsTab(events)}
            </TabsContent>

            <TabsContent value="tools">
              {renderToolsTab(events)}
            </TabsContent>
          </Tabs>

          <ControlPanel
            agentStatus={(agent.status ?? 'idle') as AgentStatus}
            sessionId={agent.session_id}
          />
        </div>
      )}
    </div>
  );
}
