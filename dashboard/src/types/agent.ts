/** Activity state of an agent avatar in the 3D scene. */
export type AgentActivity = 'idle' | 'walking' | 'typing' | 'reading' | 'chatting' | 'waiting';

/** Known agent types that can appear in the office. */
export type AgentType =
  | 'main'
  | 'code-critic'
  | 'security-reviewer'
  | 'plan-validator'
  | 'spec-compliance-reviewer'
  | 'Explore'
  | 'claude-code-guide';

/** Agent status indicating operational state. */
export type AgentStatus = 'active' | 'idle' | 'waiting' | 'error' | 'disconnected';

/** Runtime state of a single agent in the office scene. */
export interface AgentState {
  /** Unique identifier for this agent instance. */
  id: string;
  /** Session ID from the telemetry system. */
  sessionId: string;
  /** The type/role of this agent. */
  agentType: AgentType;
  /** Current avatar activity for animation. */
  activity: AgentActivity;
  /** Operational status of the agent. */
  status: AgentStatus;
  /** Index of the workstation this agent occupies. */
  workstationIndex: number;
  /** Hex color for the agent's avatar. */
  color: string;
  /** ISO 8601 timestamp of the last event from this agent. */
  lastEventAt: string;
}

/** State of a Claude Code session being tracked. */
export interface SessionState {
  /** Session UUID from telemetry. */
  id: string;
  /** Absolute path to the project directory. */
  projectDir: string;
  /** ISO 8601 timestamp when the session started. */
  startedAt: string;
  /** Whether the session is considered stale (no events for >5 min). */
  isStale: boolean;
}
