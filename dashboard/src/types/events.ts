/** Event names emitted by the telemetry system. */
export type TelemetryEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Notification'
  | 'AssistantMessage'
  | 'SessionStart'
  | 'SessionEnd';

/** A telemetry event as written to telemetry.jsonl. */
export interface TelemetryEvent {
  /** ISO 8601 timestamp. */
  ts: string;
  /** The event type. */
  event: TelemetryEventName;
  /** Session UUID. */
  session: string;
  /** Tool name (empty string for session lifecycle events). */
  tool: string;
  /** Working directory at the time of the event. */
  cwd: string;
  /** Assistant message content or tool result (truncated, for dashboard display). */
  content?: string;
  /** Tool input summary (file path, command, pattern). */
  toolInput?: string;
  /** Agent ID for subagent tracking. */
  agentId?: string;
}

/** An audit event as written to audit.jsonl. */
export interface AuditEvent {
  /** ISO 8601 timestamp. */
  ts: string;
  /** Session UUID. */
  session: string;
  /** The event type. */
  event: string;
  /** Tool name. */
  tool: string;
  /** Serialized tool input. */
  input: string;
}

/** A delegation event as written to delegation.jsonl. */
export interface DelegationEvent {
  /** ISO 8601 timestamp. */
  ts: string;
  /** Always "delegation". */
  event: 'delegation';
  /** Name/type of the delegated agent. */
  agent: string;
}

/** Message types sent over the WebSocket relay. */
export type RelayMessageType =
  | 'telemetry'
  | 'audit'
  | 'delegation'
  | 'failure'
  | 'hydration'
  | 'session-update'
  | 'command'
  | 'command-ack';

/** A message sent from the WebSocket relay to dashboard clients. */
export interface RelayMessage {
  /** The category of event being relayed. */
  type: RelayMessageType;
  /** The event payload (shape depends on type). */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp when the relay sent this message. */
  timestamp: string;
}
