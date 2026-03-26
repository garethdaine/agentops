'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return ctx !== null;
  } catch {
    return false;
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export function ActivityTable() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);

  return (
    <ScrollArea className="h-full w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Current Tool</TableHead>
            <TableHead>Last Event</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeAgents.map((agent) => (
            <TableRow key={agent.session_id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>{agent.status}</TableCell>
              <TableCell>{agent.currentTool ?? '—'}</TableCell>
              <TableCell>{formatTimestamp(agent.lastEventAt)}</TableCell>
            </TableRow>
          ))}
          {activeAgents.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No active agents
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
