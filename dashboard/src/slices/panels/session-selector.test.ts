import { describe, it, expect } from 'vitest';
import {
  filterAgentsBySession,
  type SessionOption,
  buildSessionOptions,
} from './SessionSelector';
import type { AgentState, SessionState } from '@/stores/agent-store';

describe('buildSessionOptions', () => {
  it('should return "All" option plus one per session', () => {
    const sessions = new Map<string, SessionState>([
      ['sess-1', { session_id: 'sess-1', project_dir: '/proj/a', started_at: '2026-03-26T10:00:00Z', pid: 100 }],
      ['sess-2', { session_id: 'sess-2', project_dir: '/proj/b', started_at: '2026-03-26T11:00:00Z', pid: 200 }],
    ]);
    const options = buildSessionOptions(sessions);
    expect(options).toHaveLength(3); // All + 2 sessions
    expect(options[0]).toEqual({ value: 'all', label: 'All Sessions' });
    expect(options[1].value).toBe('sess-1');
    expect(options[2].value).toBe('sess-2');
  });

  it('should include project_dir in label when available', () => {
    const sessions = new Map<string, SessionState>([
      ['sess-1', { session_id: 'sess-1', project_dir: '/proj/alpha', started_at: '2026-03-26T10:00:00Z', pid: 100 }],
    ]);
    const options = buildSessionOptions(sessions);
    expect(options[1].label).toContain('alpha');
  });

  it('should return only "All" option when no sessions', () => {
    const options = buildSessionOptions(new Map());
    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('all');
  });
});

describe('filterAgentsBySession', () => {
  const agents: AgentState[] = [
    { session_id: 'sess-1', name: 'main', type: 'main', status: 'active', currentTool: null, lastEventAt: '' },
    { session_id: 'sess-1', name: 'critic', type: 'code-critic', status: 'active', currentTool: null, lastEventAt: '' },
    { session_id: 'sess-2', name: 'main', type: 'main', status: 'active', currentTool: null, lastEventAt: '' },
  ];

  it('should return all agents when selectedSessionId is "all"', () => {
    const filtered = filterAgentsBySession(agents, 'all');
    expect(filtered).toHaveLength(3);
  });

  it('should return only agents matching selectedSessionId', () => {
    const filtered = filterAgentsBySession(agents, 'sess-1');
    expect(filtered).toHaveLength(2);
    filtered.forEach((a) => expect(a.session_id).toBe('sess-1'));
  });

  it('should return empty array when no agents match', () => {
    const filtered = filterAgentsBySession(agents, 'sess-999');
    expect(filtered).toHaveLength(0);
  });

  it('should return all agents when selectedSessionId is null', () => {
    const filtered = filterAgentsBySession(agents, null);
    expect(filtered).toHaveLength(3);
  });
});

describe('SessionSelector component', () => {
  it('should export SessionSelector as default', async () => {
    const mod = await import('./SessionSelector');
    expect(mod.default).toBeTruthy();
    expect(typeof mod.default).toBe('function');
  });
});
