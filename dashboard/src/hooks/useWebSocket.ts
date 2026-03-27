import { useAgentStore, type TelemetryEvent } from '@/stores/agent-store';
import { createEventBatcher, THROTTLE_MS, type EventBatcher } from '@/lib/event-batcher';
import { SessionRecorder } from '@/slices/session/session-recorder';
import { parseAck, serializeCommand, type Command } from '@/slices/control/control-protocol';

const WS_URL = 'ws://localhost:3099';
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = INITIAL_BACKOFF_MS;
let intentionalClose = false;
let eventBatcher: EventBatcher<TelemetryEvent> | null = null;
let ackListener: ((ack: NonNullable<ReturnType<typeof parseAck>>) => void) | null = null;

/** Shared session recorder instance for capturing raw inbound events. */
export const sessionRecorder = new SessionRecorder();

function flushEvents(events: TelemetryEvent[]): void {
  const store = useAgentStore.getState();
  for (const event of events) {
    store.addEvent(event.session, event);
  }
}

function ensureBatcher(): EventBatcher<TelemetryEvent> {
  if (!eventBatcher) {
    eventBatcher = createEventBatcher(flushEvents, { throttleMs: THROTTLE_MS });
  }
  return eventBatcher;
}

function destroyBatcher(): void {
  if (eventBatcher) {
    eventBatcher.destroy();
    eventBatcher = null;
  }
}

function handleMessage(event: MessageEvent): void {
  try {
    // Check for command-ack messages first
    const ack = parseAck(event.data);
    if (ack && ackListener) {
      ackListener(ack);
      return;
    }

    const data = JSON.parse(event.data);
    const store = useAgentStore.getState();

    if (data.event === 'delegation' && data.agent) {
      // Delegation event: spawn a new subagent avatar (REQ-039, SPEC-010)
      store.updateAgent({
        session_id: data.session || `subagent-${Date.now()}`,
        name: data.agent,
        type: data.agent,
        status: 'active',
        currentTool: null,
        lastEventAt: data.ts || new Date().toISOString(),
      });
    } else if (data.session) {
      // Auto-register session on first sighting so addEvent doesn't drop it
      if (!store.sessions.has(data.session)) {
        store.registerSession({
          session_id: data.session,
          project_dir: data.cwd || '',
          started_at: data.ts || new Date().toISOString(),
          pid: 0,
        });
      }

      // Create/update agent avatar from tool-use events
      if (data.event === 'PreToolUse' || data.event === 'PostToolUse') {
        const sessionInfo = store.sessions.get(data.session);
        const projectName = sessionInfo?.project_dir
          ? sessionInfo.project_dir.split('/').pop() || 'main'
          : 'main';
        store.updateAgent({
          session_id: data.session,
          name: projectName,
          type: data.agentId ? 'general-purpose' : 'main',
          status: 'active',
          currentTool: data.tool || null,
          lastEventAt: data.ts || new Date().toISOString(),
        });
      }

      // Capture raw event before batching for session recording (REQ-105)
      sessionRecorder.appendEvent(data as TelemetryEvent);
      ensureBatcher().push(data as TelemetryEvent);
    }
  } catch (err) {
    console.debug('[ws] Skipping malformed message:', err);
  }
}

function scheduleReconnect(): void {
  if (intentionalClose) return;

  useAgentStore.getState().setConnectionStatus('reconnecting');

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);

  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
}

function connect(): void {
  if (ws && ws.readyState <= WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    backoffMs = INITIAL_BACKOFF_MS;
    useAgentStore.getState().setConnectionStatus('connected');
  };

  ws.onclose = () => {
    ws = null;
    if (!intentionalClose) {
      scheduleReconnect();
    }
  };

  ws.onerror = () => {
    // onclose will fire after onerror, so reconnect is handled there
  };

  ws.onmessage = handleMessage;
}

export function connectWebSocket(): void {
  intentionalClose = false;
  backoffMs = INITIAL_BACKOFF_MS;
  // Clear any pending reconnect timer to prevent duplicate connections on remount/hot-reload
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  connect();
}

export function disconnectWebSocket(): void {
  intentionalClose = true;
  destroyBatcher();
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  backoffMs = INITIAL_BACKOFF_MS;
  useAgentStore.getState().setConnectionStatus('disconnected');
}

/** Send a command to the relay server. Returns false if WebSocket is not connected. */
export function sendCommand(cmd: Command): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  ws.send(serializeCommand(cmd));
  return true;
}

/** Register a listener for command acknowledgements. */
export function onCommandAck(listener: (ack: NonNullable<ReturnType<typeof parseAck>>) => void): void {
  ackListener = listener;
}
