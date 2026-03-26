import type { AgentActivity, MonitorStyle } from './telemetry-types';

const TYPING_TOOLS = new Set(['Bash', 'Write', 'Edit']);
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob']);
const CHATTING_TOOLS = new Set(['Agent']);

const IDLE_THRESHOLD_MS = 10_000;

/**
 * Maps a tool name to the agent activity it represents.
 * Used to drive avatar animation state (REQ-038).
 */
export function mapToolToActivity(toolName: string): AgentActivity {
  if (TYPING_TOOLS.has(toolName)) return 'typing';
  if (READING_TOOLS.has(toolName)) return 'reading';
  if (CHATTING_TOOLS.has(toolName)) return 'chatting';
  return 'idle';
}

const MONITOR_STYLES: Record<string, MonitorStyle> = {
  Bash:  { color: 'green',     contentType: 'terminal' },
  Read:  { color: 'blue',      contentType: 'file' },
  Edit:  { color: 'red-green', contentType: 'diff' },
  Write: { color: 'red-green', contentType: 'diff' },
  Grep:  { color: 'yellow',    contentType: 'search' },
  Glob:  { color: 'yellow',    contentType: 'search' },
  Agent: { color: 'purple',    contentType: 'chat' },
};

const DEFAULT_MONITOR_STYLE: MonitorStyle = { color: 'gray', contentType: 'idle' };

/**
 * Maps a tool name to monitor display style (color and content type).
 * Used to drive workstation monitor appearance (REQ-030, REQ-031).
 */
export function mapToolToMonitorStyle(toolName: string): MonitorStyle {
  return MONITOR_STYLES[toolName] ?? DEFAULT_MONITOR_STYLE;
}

/**
 * Infers idle state from timestamp gap.
 * Returns 'idle' if the gap between last event and now exceeds 10 seconds,
 * or null if the agent is still considered active (REQ-038).
 */
export function inferActivityFromTimestamp(
  lastEventTs: number,
  now: number,
): AgentActivity | null {
  const gap = now - lastEventTs;
  return gap >= IDLE_THRESHOLD_MS ? 'idle' : null;
}
