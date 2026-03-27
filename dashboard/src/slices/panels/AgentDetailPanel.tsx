'use client';

import React, { useMemo } from 'react';
import { useStore } from 'zustand';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
}

function EventEntry({ entry }: { entry: EventEntryData }) {
  const time = new Date(entry.ts).toLocaleTimeString();
  return (
    <div data-testid="event-entry" className="flex items-center justify-between py-1 px-2 text-xs border-b border-border/50">
      <span className="text-muted-foreground">{time}</span>
      <span>{entry.event}</span>
      {entry.tool && <span className="font-mono">{entry.tool}</span>}
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

  return (
    <Sheet open={detailPanelOpen} onOpenChange={setDetailPanelOpen}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>{agent?.name ?? 'Agent'}</SheetTitle>
          <SheetDescription>{agent?.type ?? ''}</SheetDescription>
        </SheetHeader>

        {agent && (
          <>
            <Tabs defaultValue="overview" className="px-4">
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
