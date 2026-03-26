/** Activity states for agent avatars */
export type AgentActivity = 'typing' | 'reading' | 'chatting' | 'idle';

/** Monitor display style for workstation screens */
export interface MonitorStyle {
  color: 'green' | 'blue' | 'red-green' | 'yellow' | 'purple' | 'gray';
  contentType: 'terminal' | 'file' | 'diff' | 'search' | 'chat' | 'idle';
}

/** Raw telemetry event shape from .agentops/telemetry.jsonl */
export interface TelemetryEvent {
  ts: string;
  event: 'PostToolUse' | 'PostToolUseFailure' | 'PreToolUse' | 'SessionEnd';
  session: string;
  tool: string;
  cwd: string;
}
