import type {
  AgentState,
  SessionState,
  AgentActivity,
  AgentType,
} from './agent';
import type {
  Zone,
  Workstation,
  AvatarState,
  MonitorStyle,
} from './office';
import type {
  TelemetryEvent,
  AuditEvent,
  DelegationEvent,
  RelayMessage,
} from './events';

describe('Type Definitions', () => {
  it('should compile AgentState with all required fields', () => {
    const agent: AgentState = {
      id: 'agent-1',
      sessionId: 'session-abc',
      agentType: 'main',
      activity: 'typing',
      status: 'active',
      workstationIndex: 0,
      color: '#3b82f6',
      lastEventAt: '2026-03-16T12:37:00Z',
    };
    expect(agent.id).toBeDefined();
  });

  it('should compile SessionState with all required fields', () => {
    const session: SessionState = {
      id: 'session-abc',
      projectDir: '/Users/dev/project',
      startedAt: '2026-03-16T12:00:00Z',
      isStale: false,
    };
    expect(session.id).toBeDefined();
  });

  it('should compile Zone with all required fields', () => {
    const zone: Zone = {
      id: 'workstation-zone',
      name: 'Workstation Area',
      position: { x: 0, y: 0, z: 0 },
      size: { width: 10, depth: 8 },
    };
    expect(zone.id).toBeDefined();
  });

  it('should compile Workstation with all required fields', () => {
    const ws: Workstation = {
      index: 0,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      occupied: false,
    };
    expect(ws.index).toBeDefined();

    const wsOccupied: Workstation = {
      index: 1,
      position: { x: 2, y: 0, z: 0 },
      rotation: Math.PI,
      occupied: true,
      agentId: 'agent-1',
    };
    expect(wsOccupied.agentId).toBeDefined();
  });

  it('should compile AvatarState with all required fields', () => {
    const avatar: AvatarState = {
      activity: 'typing',
      color: '#3b82f6',
      nameplate: 'Main Agent',
    };
    expect(avatar.activity).toBeDefined();
  });

  it('should compile MonitorStyle with all required fields', () => {
    const monitor: MonitorStyle = {
      backgroundColor: '#1e1e1e',
      textColor: '#d4d4d4',
      contentType: 'code',
    };
    expect(monitor.contentType).toBeDefined();
  });

  it('should compile TelemetryEvent matching JSONL shape', () => {
    const event: TelemetryEvent = {
      ts: '2026-03-16T12:37:00Z',
      event: 'PostToolUse',
      session: '87303570-59c6-4100-82fe-f3b6906357a2',
      tool: 'Bash',
      cwd: '/Users/dev/project',
    };
    expect(event.ts).toBeDefined();
  });

  it('should compile AuditEvent with all required fields', () => {
    const audit: AuditEvent = {
      ts: '2026-03-16T12:37:00Z',
      session: 'session-abc',
      event: 'PostToolUse',
      tool: 'Edit',
      input: '{ "file": "test.ts" }',
    };
    expect(audit.ts).toBeDefined();
  });

  it('should compile DelegationEvent matching JSONL shape', () => {
    const delegation: DelegationEvent = {
      ts: '2026-03-17T07:13:07Z',
      event: 'delegation',
      agent: 'Explore',
    };
    expect(delegation.event).toBe('delegation');
  });

  it('should compile RelayMessage with all required fields', () => {
    const msg: RelayMessage = {
      type: 'telemetry',
      payload: { ts: '2026-03-16T12:37:00Z', event: 'PostToolUse' },
      timestamp: '2026-03-16T12:37:00Z',
    };
    expect(msg.type).toBeDefined();
  });

  it('should enforce AgentActivity union type', () => {
    const activities: AgentActivity[] = [
      'idle',
      'typing',
      'reading',
      'chatting',
      'waiting',
    ];
    expect(activities).toHaveLength(5);
  });

  it('should enforce AgentType union type', () => {
    const types: AgentType[] = [
      'main',
      'code-critic',
      'security-reviewer',
      'plan-validator',
      'spec-compliance-reviewer',
    ];
    expect(types).toHaveLength(5);
  });
});
