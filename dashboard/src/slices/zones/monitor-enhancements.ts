import type { AgentActivity } from '@/types/agent';

/** LED color for each agent activity on monitor bezels. */
const LED_COLORS = {
  typing: '#10b981',
  reading: '#3b82f6',
  chatting: '#f59e0b',
  waiting: '#ff8844',
  walking: '#334455',
  idle: '#334455',
} as const satisfies Record<AgentActivity, string>;

/** Emissive glow settings per activity. */
const EMISSIVE_MAP = {
  typing: { color: '#002211', intensity: 0.15 },
  reading: { color: '#001122', intensity: 0.12 },
  chatting: { color: '#221100', intensity: 0.12 },
  waiting: { color: '#111100', intensity: 0.10 },
  walking: { color: '#001108', intensity: 0.05 },
  idle: { color: '#001108', intensity: 0.05 },
} as const satisfies Record<AgentActivity, { color: string; intensity: number }>;

/** Default war room emissive color when active. */
const WAR_ROOM_EMISSIVE_COLOR = '#003344';

/** Return the LED hex color for a given agent activity. */
export function getMonitorLedColor(activity: AgentActivity): string {
  return LED_COLORS[activity] ?? LED_COLORS.idle;
}

/** Return emissive color and intensity for a given agent activity. */
export function getMonitorEmissive(activity: AgentActivity): {
  color: string;
  intensity: number;
} {
  const entry = EMISSIVE_MAP[activity] ?? EMISSIVE_MAP.idle;
  return { color: entry.color, intensity: entry.intensity };
}

/** Compute war room screen emissive state from active run count. */
export function getWarRoomEmissiveState(activeRuns: number): {
  active: boolean;
  emissiveIntensity: number;
  emissiveColor: string;
} {
  if (activeRuns <= 0) {
    return { active: false, emissiveIntensity: 0.05, emissiveColor: WAR_ROOM_EMISSIVE_COLOR };
  }
  const intensity = Math.min(0.3 + activeRuns * 0.1, 1.0);
  return { active: true, emissiveIntensity: intensity, emissiveColor: WAR_ROOM_EMISSIVE_COLOR };
}
