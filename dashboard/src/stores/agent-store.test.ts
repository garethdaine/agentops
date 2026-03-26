import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAgentStore, type TelemetryEvent, type AgentState, type SessionState } from './agent-store';

describe('AgentStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useAgentStore.setState({
      sessions: new Map(),
      activeAgents: [],
      recentEvents: new Map(),
      connectionStatus: 'disconnected',
    });
  });

  it('should initialize with empty state', () => {
    const state = useAgentStore.getState();
    expect(state.sessions.size).toBe(0);
    expect(state.activeAgents).toEqual([]);
    expect(state.recentEvents.size).toBe(0);
    expect(state.connectionStatus).toBe('disconnected');
  });

  describe('registerSession', () => {
    it('should register a new session', () => {
      const session: SessionState = {
        session_id: 'sess-1',
        project_dir: '/project',
        started_at: '2026-03-26T00:00:00Z',
        pid: 1234,
      };

      useAgentStore.getState().registerSession(session);
      const state = useAgentStore.getState();

      expect(state.sessions.get('sess-1')).toEqual(session);
      expect(state.recentEvents.get('sess-1')).toEqual([]);
    });
  });

  describe('removeSession', () => {
    it('should clean up session data on removeSession', () => {
      const session: SessionState = {
        session_id: 'sess-1',
        project_dir: '/project',
        started_at: '2026-03-26T00:00:00Z',
        pid: 1234,
      };

      const { registerSession, addEvent, removeSession } = useAgentStore.getState();
      registerSession(session);
      addEvent('sess-1', {
        ts: '2026-03-26T00:00:01Z',
        event: 'PostToolUse',
        session: 'sess-1',
        tool: 'Read',
        cwd: '/project',
      });

      removeSession('sess-1');
      const state = useAgentStore.getState();

      expect(state.sessions.has('sess-1')).toBe(false);
      expect(state.recentEvents.has('sess-1')).toBe(false);
    });

    it('should remove agent associated with session', () => {
      const session: SessionState = {
        session_id: 'sess-1',
        project_dir: '/project',
        started_at: '2026-03-26T00:00:00Z',
        pid: 1234,
      };

      const { registerSession, updateAgent, removeSession } = useAgentStore.getState();
      registerSession(session);
      updateAgent({
        session_id: 'sess-1',
        name: 'main',
        type: 'main',
        status: 'active',
        currentTool: null,
        lastEventAt: '2026-03-26T00:00:00Z',
      });

      expect(useAgentStore.getState().activeAgents).toHaveLength(1);

      removeSession('sess-1');
      expect(useAgentStore.getState().activeAgents).toHaveLength(0);
    });
  });

  describe('addEvent', () => {
    it('should append event to recentEvents', () => {
      const session: SessionState = {
        session_id: 'sess-1',
        project_dir: '/project',
        started_at: '2026-03-26T00:00:00Z',
        pid: 1234,
      };

      const { registerSession, addEvent } = useAgentStore.getState();
      registerSession(session);

      const event: TelemetryEvent = {
        ts: '2026-03-26T00:00:01Z',
        event: 'PostToolUse',
        session: 'sess-1',
        tool: 'Read',
        cwd: '/project',
      };

      addEvent('sess-1', event);
      const events = useAgentStore.getState().recentEvents.get('sess-1');
      expect(events).toHaveLength(1);
      expect(events![0]).toEqual(event);
    });

    it('should cap recentEvents at 1000 per session (sliding window)', () => {
      const session: SessionState = {
        session_id: 'sess-1',
        project_dir: '/project',
        started_at: '2026-03-26T00:00:00Z',
        pid: 1234,
      };

      const { registerSession, addEvent } = useAgentStore.getState();
      registerSession(session);

      // Add 1050 events
      for (let i = 0; i < 1050; i++) {
        addEvent('sess-1', {
          ts: `2026-03-26T00:00:${String(i).padStart(2, '0')}Z`,
          event: 'PostToolUse',
          session: 'sess-1',
          tool: `Tool-${i}`,
          cwd: '/project',
        });
      }

      const events = useAgentStore.getState().recentEvents.get('sess-1')!;
      expect(events).toHaveLength(1000);
      // Should keep the last 1000 events (50-1049)
      expect(events[0].tool).toBe('Tool-50');
      expect(events[999].tool).toBe('Tool-1049');
    });

    it('should auto-initialize events for unregistered session', () => {
      useAgentStore.getState().addEvent('nonexistent', {
        ts: '2026-03-26T00:00:01Z',
        event: 'PostToolUse',
        session: 'nonexistent',
        tool: 'Read',
        cwd: '/project',
      });

      const events = useAgentStore.getState().recentEvents.get('nonexistent');
      expect(events).toHaveLength(1);
      expect(events![0].tool).toBe('Read');
    });
  });

  describe('updateAgent', () => {
    it('should add a new agent', () => {
      const agent: AgentState = {
        session_id: 'sess-1',
        name: 'main',
        type: 'main',
        status: 'active',
        currentTool: 'Read',
        lastEventAt: '2026-03-26T00:00:01Z',
      };

      useAgentStore.getState().updateAgent(agent);
      expect(useAgentStore.getState().activeAgents).toHaveLength(1);
      expect(useAgentStore.getState().activeAgents[0]).toEqual(agent);
    });

    it('should update an existing agent by session_id', () => {
      const agent: AgentState = {
        session_id: 'sess-1',
        name: 'main',
        type: 'main',
        status: 'active',
        currentTool: 'Read',
        lastEventAt: '2026-03-26T00:00:01Z',
      };

      useAgentStore.getState().updateAgent(agent);
      useAgentStore.getState().updateAgent({
        ...agent,
        currentTool: 'Write',
        status: 'typing',
      });

      expect(useAgentStore.getState().activeAgents).toHaveLength(1);
      expect(useAgentStore.getState().activeAgents[0].currentTool).toBe('Write');
      expect(useAgentStore.getState().activeAgents[0].status).toBe('typing');
    });
  });

  describe('setConnectionStatus', () => {
    it('should update connection status', () => {
      useAgentStore.getState().setConnectionStatus('connected');
      expect(useAgentStore.getState().connectionStatus).toBe('connected');

      useAgentStore.getState().setConnectionStatus('reconnecting');
      expect(useAgentStore.getState().connectionStatus).toBe('reconnecting');
    });
  });
});

describe('useWebSocket', () => {
  let mockWebSocket: {
    onopen: ((ev: Event) => void) | null;
    onclose: ((ev: CloseEvent) => void) | null;
    onmessage: ((ev: MessageEvent) => void) | null;
    onerror: ((ev: Event) => void) | null;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  };
  let WebSocketInstances: typeof mockWebSocket[];

  beforeEach(() => {
    useAgentStore.setState({
      sessions: new Map(),
      activeAgents: [],
      recentEvents: new Map(),
      connectionStatus: 'disconnected',
    });

    WebSocketInstances = [];
    vi.useFakeTimers();

    // Mock global WebSocket
    vi.stubGlobal('WebSocket', class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      onopen: ((ev: Event) => void) | null = null;
      onclose: ((ev: CloseEvent) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      close = vi.fn();
      readyState = 0;

      constructor(public url: string) {
        mockWebSocket = this;
        WebSocketInstances.push(this);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should connect to ws://localhost:3099', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');
    connectWebSocket();

    expect(WebSocketInstances).toHaveLength(1);
    expect(WebSocketInstances[0].url).toBe('ws://localhost:3099');

    disconnectWebSocket();
  });

  it('should set connection status to connected on open', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');
    connectWebSocket();

    mockWebSocket.onopen?.(new Event('open'));
    expect(useAgentStore.getState().connectionStatus).toBe('connected');

    disconnectWebSocket();
  });

  it('should reconnect with exponential backoff on disconnect', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');
    connectWebSocket();

    // First connection closes
    mockWebSocket.onclose?.(new CloseEvent('close'));
    expect(useAgentStore.getState().connectionStatus).toBe('reconnecting');

    // After 1 second, should reconnect
    vi.advanceTimersByTime(1000);
    expect(WebSocketInstances).toHaveLength(2);

    // Second connection closes
    mockWebSocket.onclose?.(new CloseEvent('close'));

    // After 2 seconds, should reconnect
    vi.advanceTimersByTime(2000);
    expect(WebSocketInstances).toHaveLength(3);

    // Third connection closes
    mockWebSocket.onclose?.(new CloseEvent('close'));

    // After 4 seconds, should reconnect
    vi.advanceTimersByTime(4000);
    expect(WebSocketInstances).toHaveLength(4);

    disconnectWebSocket();
  });

  it('should cap backoff at 30 seconds', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');
    connectWebSocket();

    // Simulate many disconnects to exceed 30s cap
    // 1, 2, 4, 8, 16, 32 -> should cap at 30
    for (let i = 0; i < 5; i++) {
      mockWebSocket.onclose?.(new CloseEvent('close'));
      vi.advanceTimersByTime(Math.min(1000 * Math.pow(2, i), 30000));
    }

    // 6th disconnect - backoff would be 32s, but capped at 30s
    const countBefore = WebSocketInstances.length;
    mockWebSocket.onclose?.(new CloseEvent('close'));

    // At 30s should reconnect (not 32s)
    vi.advanceTimersByTime(30000);
    expect(WebSocketInstances.length).toBe(countBefore + 1);

    disconnectWebSocket();
  });

  it('should reset backoff on successful connection', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');
    connectWebSocket();

    // Disconnect and reconnect a few times
    mockWebSocket.onclose?.(new CloseEvent('close'));
    vi.advanceTimersByTime(1000);
    mockWebSocket.onclose?.(new CloseEvent('close'));
    vi.advanceTimersByTime(2000);

    // Now successfully connect
    mockWebSocket.onopen?.(new Event('open'));

    // Then disconnect again - backoff should reset to 1s
    mockWebSocket.onclose?.(new CloseEvent('close'));
    const countBefore = WebSocketInstances.length;
    vi.advanceTimersByTime(1000);
    expect(WebSocketInstances.length).toBe(countBefore + 1);

    disconnectWebSocket();
  });

  it('should process incoming telemetry messages', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');

    // Register a session first
    useAgentStore.getState().registerSession({
      session_id: 'sess-1',
      project_dir: '/project',
      started_at: '2026-03-26T00:00:00Z',
      pid: 1234,
    });

    connectWebSocket();
    mockWebSocket.onopen?.(new Event('open'));

    const event: TelemetryEvent = {
      ts: '2026-03-26T00:00:01Z',
      event: 'PostToolUse',
      session: 'sess-1',
      tool: 'Read',
      cwd: '/project',
    };

    mockWebSocket.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(event),
    }));

    const events = useAgentStore.getState().recentEvents.get('sess-1');
    expect(events).toHaveLength(1);
    expect(events![0]).toEqual(event);

    disconnectWebSocket();
  });

  it('should auto-register session on first telemetry event', async () => {
    const { connectWebSocket, disconnectWebSocket } = await import('../hooks/useWebSocket');

    connectWebSocket();
    mockWebSocket.onopen?.(new Event('open'));

    // Send an event for a session that was never registered
    const event: TelemetryEvent = {
      ts: '2026-03-26T00:00:01Z',
      event: 'PostToolUse',
      session: 'auto-sess',
      tool: 'Bash',
      cwd: '/my-project',
    };

    mockWebSocket.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(event),
    }));

    const state = useAgentStore.getState();
    // Session should have been auto-registered
    expect(state.sessions.has('auto-sess')).toBe(true);
    expect(state.sessions.get('auto-sess')!.project_dir).toBe('/my-project');
    // Event should have been added
    const events = state.recentEvents.get('auto-sess');
    expect(events).toHaveLength(1);
    expect(events![0].tool).toBe('Bash');

    disconnectWebSocket();
  });
});
