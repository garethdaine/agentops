import { createStore } from 'zustand/vanilla';

const MAX_EVENTS_PER_SESSION = 1000;

export interface TelemetryEvent {
  ts: string;
  event: string;
  session: string;
  tool: string;
  cwd: string;
  [key: string]: unknown;
}

export interface SessionState {
  session_id: string;
  project_dir: string;
  started_at: string;
  pid: number;
}

export interface AgentState {
  session_id: string;
  name: string;
  type: string;
  status: string;
  currentTool: string | null;
  lastEventAt: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface AgentStoreState {
  sessions: Map<string, SessionState>;
  activeAgents: AgentState[];
  recentEvents: Map<string, TelemetryEvent[]>;
  connectionStatus: ConnectionStatus;

  addEvent: (sessionId: string, event: TelemetryEvent) => void;
  updateAgent: (agent: AgentState) => void;
  registerSession: (session: SessionState) => void;
  removeSession: (sessionId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useAgentStore = createStore<AgentStoreState>((set, get) => ({
  sessions: new Map(),
  activeAgents: [],
  recentEvents: new Map(),
  connectionStatus: 'disconnected' as ConnectionStatus,

  addEvent: (sessionId: string, event: TelemetryEvent) => {
    const { recentEvents } = get();
    const sessionEvents = recentEvents.get(sessionId);
    if (sessionEvents === undefined) return;

    const updated = [...sessionEvents, event];
    const trimmed = updated.length > MAX_EVENTS_PER_SESSION
      ? updated.slice(updated.length - MAX_EVENTS_PER_SESSION)
      : updated;

    const newMap = new Map(recentEvents);
    newMap.set(sessionId, trimmed);
    set({ recentEvents: newMap });
  },

  updateAgent: (agent: AgentState) => {
    const { activeAgents } = get();
    const idx = activeAgents.findIndex(a => a.session_id === agent.session_id);
    if (idx === -1) {
      set({ activeAgents: [...activeAgents, agent] });
    } else {
      const updated = [...activeAgents];
      updated[idx] = agent;
      set({ activeAgents: updated });
    }
  },

  registerSession: (session: SessionState) => {
    const { sessions, recentEvents } = get();
    const newSessions = new Map(sessions);
    newSessions.set(session.session_id, session);
    const newEvents = new Map(recentEvents);
    newEvents.set(session.session_id, []);
    set({ sessions: newSessions, recentEvents: newEvents });
  },

  removeSession: (sessionId: string) => {
    const { sessions, recentEvents, activeAgents } = get();
    const newSessions = new Map(sessions);
    newSessions.delete(sessionId);
    const newEvents = new Map(recentEvents);
    newEvents.delete(sessionId);
    const newAgents = activeAgents.filter(a => a.session_id !== sessionId);
    set({ sessions: newSessions, recentEvents: newEvents, activeAgents: newAgents });
  },

  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },
}));
