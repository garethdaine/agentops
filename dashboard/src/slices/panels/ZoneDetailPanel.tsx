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
import { ZONE_PANEL_MAP } from './zone-panels';

interface ZoneDetailPanelProps {
  zone: Zone | null;
  onClose: () => void;
  agents: AgentState[];
}

/** Slide-in panel showing zone-specific content when zone furniture is clicked. */
export default function ZoneDetailPanel({ zone, onClose, agents }: ZoneDetailPanelProps) {
  const PanelContent = zone ? ZONE_PANEL_MAP[zone.id] : null;

  return (
    <Sheet open={!!zone} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[400px] bg-gray-900/95 border-gray-700 text-gray-100 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-gray-100">{zone?.name ?? 'Zone'}</SheetTitle>
          <SheetDescription className="sr-only">Zone details</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          {PanelContent ? (
            <PanelContent />
          ) : (
            zone && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400">Position</h3>
                  <p className="text-sm text-gray-200">
                    x: {zone.position.x}, z: {zone.position.z}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400">Size</h3>
                  <p className="text-sm text-gray-200">
                    {zone.size.width} x {zone.size.depth}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400">
                    Agents ({agents.length})
                  </h3>
                  {agents.length === 0 ? (
                    <p className="text-sm text-gray-400">No agents in this zone</p>
                  ) : (
                    <ul className="space-y-1">
                      {agents.map((a) => (
                        <li key={a.session_id} className="text-sm flex justify-between text-gray-200">
                          <span>{a.name}</span>
                          <span className="text-gray-400">{a.status ?? 'idle'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
