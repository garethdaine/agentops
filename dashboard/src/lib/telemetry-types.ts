/** Activity states for agent avatars */
export type AgentActivity = 'typing' | 'reading' | 'chatting' | 'idle';

/** Monitor display style for workstation screens */
export interface MonitorStyle {
  color: 'green' | 'blue' | 'red-green' | 'yellow' | 'purple' | 'gray';
  contentType: 'terminal' | 'file' | 'diff' | 'search' | 'chat' | 'idle';
}

// Re-export canonical TelemetryEvent from types/events
export type { TelemetryEvent } from '@/types/events';
