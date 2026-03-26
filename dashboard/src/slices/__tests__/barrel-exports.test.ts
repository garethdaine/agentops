import { describe, it, expect } from 'vitest';

describe('Slice barrel exports', () => {
  it('should export scene components from slices/scene', async () => {
    const scene = await import('@/slices/scene');
    expect(scene.OfficeFloor).toBeDefined();
    expect(scene.OfficeWalls).toBeDefined();
    expect(scene.OfficeLighting).toBeDefined();
  });

  it('should export agent components from slices/agents', async () => {
    const agents = await import('@/slices/agents');
    expect(agents.AgentAvatar).toBeDefined();
  });

  it('should export zone components from slices/zones', async () => {
    const zones = await import('@/slices/zones');
    expect(zones.Workstation).toBeDefined();
    expect(zones.MonitorScreen).toBeDefined();
  });

  it('should export empty barrels for future slices', async () => {
    const env = await import('@/slices/environment');
    expect(env).toBeDefined();
    const session = await import('@/slices/session');
    expect(session).toBeDefined();
    const control = await import('@/slices/control');
    expect(control).toBeDefined();
    const panels = await import('@/slices/panels');
    expect(panels).toBeDefined();
  });

  it('should still resolve old import paths via re-exports', async () => {
    // These shim re-exports keep existing consumers working
    const floor = await import('@/components/office/OfficeFloor');
    expect(floor.default).toBeDefined();
    const avatar = await import('@/components/office/AgentAvatar');
    expect(avatar.default).toBeDefined();
    const workstation = await import('@/components/office/Workstation');
    expect(workstation.default).toBeDefined();
  });
});
