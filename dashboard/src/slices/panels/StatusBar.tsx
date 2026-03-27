'use client';

import { useStore } from 'zustand';
import { useAgentStore } from '@/stores/agent-store';
import { useOfficeStore } from '@/stores/office-store';
import { getAgentColor } from '@/lib/avatar-animations';

const ACTIVITY_LABELS: Record<string, string> = {
  idle: 'Idle',
  writing_code: 'Writing Code',
  analyzing: 'Analyzing',
  reviewing: 'Reviewing',
  testing: 'Running Tests',
  debugging: 'Debugging',
  planning: 'Planning',
  working: 'Working',
};

/** Bottom status bar showing agents, day/night toggle, and WASD hints. */
export default function StatusBar() {
  const activeAgents = useStore(useAgentStore, (s) => s.activeAgents);
  const envOverride = useStore(useOfficeStore, (s) => s.envOverride);
  const setEnvOverride = useStore(useOfficeStore, (s) => s.setEnvOverride);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 20, 35, 0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        zIndex: 20,
        pointerEvents: 'auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Agent list */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {activeAgents.length === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)', borderRadius: 8,
            padding: '6px 12px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#6b7280', display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
              No active agents
            </span>
          </div>
        )}
        {activeAgents.map((agent) => {
          const statusColor = agent.status === 'active' ? '#22c55e'
            : agent.status === 'failed' ? '#ef4444'
            : agent.status === 'waiting' ? '#f59e0b'
            : '#60a5fa';
          const label = agent.currentTool
            ? agent.currentTool
            : ACTIVITY_LABELS[agent.status] ?? 'Idle';
          return (
            <div
              key={agent.session_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                padding: '6px 12px',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: statusColor, display: 'inline-block',
              }} />
              <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {agent.name || 'Agent'} &mdash; {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right side: Day/Night/Auto + WASD */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16, flexShrink: 0 }}>
        {/* Day/Night/Auto toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: 2,
          background: 'rgba(255,255,255,0.03)',
        }}>
          {([
            { key: null, label: 'Auto', icon: '\u2699', activeColor: 'rgba(99,102,241,0.2)', activeText: '#818cf8' },
            { key: 'day' as const, label: 'Day', icon: '\u2600', activeColor: 'rgba(245,158,11,0.2)', activeText: '#fbbf24' },
            { key: 'night' as const, label: 'Night', icon: '\u263D', activeColor: 'rgba(99,102,241,0.2)', activeText: '#a5b4fc' },
          ] as const).map(({ key, label, icon, activeColor, activeText }) => (
            <button
              key={label}
              onClick={() => setEnvOverride(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6,
                border: 'none', cursor: 'pointer',
                fontSize: 10, fontWeight: 500,
                background: envOverride === key ? activeColor : 'transparent',
                color: envOverride === key ? activeText : '#9ca3af',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 12 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

        {/* WASD hints */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(156,163,175,0.7)' }}>
          {['W', 'A', 'S', 'D'].map((k) => (
            <kbd key={k} style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 3, padding: '2px 5px',
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(156,163,175,0.7)',
            }}>{k}</kbd>
          ))}
          <span style={{ marginLeft: 2 }}>Move</span>
          <span style={{ margin: '0 4px', color: 'rgba(255,255,255,0.15)' }}>|</span>
          {['Q', 'E'].map((k) => (
            <kbd key={k} style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 3, padding: '2px 5px',
              fontFamily: 'monospace', fontSize: 10,
              color: 'rgba(156,163,175,0.7)',
            }}>{k}</kbd>
          ))}
          <span style={{ marginLeft: 2 }}>Height</span>
        </div>
      </div>
    </div>
  );
}
