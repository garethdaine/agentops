/** Valid command types for agent control. */
export type CommandType = 'pause' | 'resume' | 'cancel';

/** Ack status values returned by the target. */
export type AckStatus = 'accepted' | 'rejected' | 'error';

/** Protocol constants — single source of truth for protocol parameters. */
export const PROTOCOL_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 5000,
} as const;

/** A command message sent from dashboard to relay. */
export interface Command {
  id: string;
  type: 'command';
  command: CommandType;
  target: string;
}

/** An acknowledgement message received from relay. */
export interface CommandAck {
  id: string;
  status: AckStatus;
  reason?: string;
}

/** Discriminated union for messages in the command channel. */
export type CommandChannelMessage =
  | (Command & { type: 'command' })
  | (CommandAck & { type: 'command-ack' });

/** Callbacks for tracking a pending command. */
export interface TrackOptions {
  onResolve?: (ack: CommandAck) => void;
  onTimeout?: (commandId: string) => void;
}

interface PendingEntry {
  command: Command;
  timer: ReturnType<typeof setTimeout>;
  options: TrackOptions;
}

/** Generate a unique correlation ID for a command. */
export function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `cmd-${crypto.randomUUID()}`;
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new command with a unique correlation ID. */
export function createCommand(command: CommandType, target: string): Command {
  return {
    id: generateCorrelationId(),
    type: 'command',
    command,
    target,
  };
}

/** Serialize a command to a JSON string for sending over WebSocket. */
export function serializeCommand(cmd: Command): string {
  return JSON.stringify(cmd);
}

/** Parse a raw WebSocket message as a CommandAck. Returns null if not an ack or malformed. */
export function parseAck(raw: string): CommandAck | null {
  try {
    const data = JSON.parse(raw);
    if (data.type !== 'command-ack') return null;
    if (typeof data.id !== 'string' || typeof data.status !== 'string') return null;
    const ack: CommandAck = { id: data.id, status: data.status };
    if (data.reason) ack.reason = data.reason;
    return ack;
  } catch {
    return null;
  }
}

/** Tracks pending commands and handles timeouts and ack resolution. */
export class CommandTracker {
  private readonly pending = new Map<string, PendingEntry>();
  private readonly timeoutMs: number;

  constructor(options: { timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? PROTOCOL_CONSTANTS.DEFAULT_TIMEOUT_MS;
  }

  /** Track a command, starting its timeout timer. Duplicate IDs are ignored. */
  track(cmd: Command, options: TrackOptions = {}): void {
    if (this.pending.has(cmd.id)) return;

    const timer = setTimeout(() => {
      this.removePending(cmd.id);
      options.onTimeout?.(cmd.id);
    }, this.timeoutMs);

    this.pending.set(cmd.id, { command: cmd, timer, options });
  }

  /** Handle an incoming ack, resolving the corresponding pending command. */
  handleAck(ack: CommandAck): void {
    const entry = this.pending.get(ack.id);
    if (!entry) return;

    clearTimeout(entry.timer);
    this.pending.delete(ack.id);
    entry.options.onResolve?.(ack);
  }

  /** Return all currently pending commands. */
  getPending(): Command[] {
    return Array.from(this.pending.values()).map((e) => e.command);
  }

  /** Dispose all pending timeouts and clear tracking state. */
  dispose(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
    }
    this.pending.clear();
  }

  private removePending(id: string): void {
    this.pending.delete(id);
  }
}
