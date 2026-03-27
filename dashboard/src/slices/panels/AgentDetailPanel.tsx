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
  agentId?: string;
}

function EventEntry({ entry }: { entry: EventEntryData }) {
  const time = new Date(entry.ts).toLocaleTimeString();
  const hasContent = entry.content && entry.content.length > 0;
  return (
    <div data-testid="event-entry" className="py-2 px-3 text-xs border-b border-gray-800">
      <div className="flex items-center justify-between">
        <span className="text-gray-500">{time}</span>
        <div className="flex items-center gap-2">
          {entry.tool && <span className="font-mono text-gray-300">{entry.tool}</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            entry.event === 'Notification' ? 'bg-indigo-500/20 text-indigo-300' :
            entry.event === 'PostToolUse' ? 'bg-emerald-500/20 text-emerald-300' :
            'bg-gray-700 text-gray-400'
          }`}>{entry.event}</span>
        </div>
      </div>
      {hasContent && (
        <p className="mt-1 text-[11px] text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {entry.content}
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
  const limited = events.slice(-100);
  return (
    <div className="overflow-y-auto max-h-[60vh]">
      {limited.map((entry, i) => (
        <EventEntry key={`${entry.ts}-${i}`} entry={entry} />
      ))}
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
    <div className="absolute top-1 right-1 bottom-14 w-[380px] z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
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
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {renderOverviewTab(agent)}
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
