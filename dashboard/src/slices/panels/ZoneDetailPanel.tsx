'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Zone } from '@/types/office';
import type { AgentState } from '@/stores/agent-store';

interface ZoneDetailPanelProps {
  zone: Zone | null;
  onClose: () => void;
  agents: AgentState[];
}

/** Slide-in panel showing zone information when zone furniture is clicked. */
export default function ZoneDetailPanel({ zone, onClose, agents }: ZoneDetailPanelProps) {
  return (
    <Sheet open={!!zone} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[360px]">
        <SheetHeader>
          <SheetTitle>{zone?.name ?? 'Zone'}</SheetTitle>
          <SheetDescription>Zone: {zone?.id ?? ''}</SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-4">
          {zone && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Position</h3>
                <p className="text-sm">
                  x: {zone.position.x}, z: {zone.position.z}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Size</h3>
                <p className="text-sm">
                  {zone.size.width} x {zone.size.depth}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Agents ({agents.length})
                </h3>
                {agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agents in this zone</p>
                ) : (
                  <ul className="space-y-1">
                    {agents.map((a) => (
                      <li key={a.session_id} className="text-sm flex justify-between">
                        <span>{a.name}</span>
                        <span className="text-muted-foreground">{a.status ?? 'idle'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
