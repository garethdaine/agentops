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
    const data = JSON.parse(event.data) as TelemetryEvent;
    if (data.session) {
      useAgentStore.getState().addEvent(data.session, data);
    }
  } catch {
    // Skip malformed messages
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
