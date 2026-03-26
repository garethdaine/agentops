import { useAgentStore, type TelemetryEvent } from '@/stores/agent-store';

const WS_URL = 'ws://localhost:3099';
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = INITIAL_BACKOFF_MS;
let intentionalClose = false;

function handleMessage(event: MessageEvent): void {
  try {
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
      store.addEvent(data.session, data as TelemetryEvent);
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
  connect();
}

export function disconnectWebSocket(): void {
  intentionalClose = true;
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
