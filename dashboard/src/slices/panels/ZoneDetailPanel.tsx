'use client';

import type { Zone } from '@/types/office';
import type { AgentState } from '@/stores/agent-store';
import { ZONE_PANEL_MAP } from './zone-panels';

interface ZoneDetailPanelProps {
  zone: Zone | null;
  onClose: () => void;
  agents: AgentState[];
}

/** Side panel showing zone-specific content when zone furniture is clicked. No overlay/blur. */
export default function ZoneDetailPanel({ zone, onClose, agents }: ZoneDetailPanelProps) {
  if (!zone) return null;

  const PanelContent = ZONE_PANEL_MAP[zone.id] ?? null;

  return (
    <div className="absolute top-2 -right-3 bottom-12 w-[380px] z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{zone.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          aria-label="Close panel"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {PanelContent ? (
          <PanelContent />
        ) : (
          <div className="space-y-4 p-4">
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
        )}
      </div>
    </div>
  );
}
