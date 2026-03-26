import { describe, it, expect } from 'vitest';

describe('AgentAvatar component exports', () => {
  it('should export AgentAvatar as default', async () => {
    const mod = await import('../AgentAvatar');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('AgentAvatar named exports', () => {
  it('should export AVATAR_BODY dimensions', async () => {
    const mod = await import('../AgentAvatar');
    expect(mod.AVATAR_BODY).toBeDefined();
    expect(mod.AVATAR_BODY.width).toBeCloseTo(0.6, 1);
    expect(mod.AVATAR_BODY.height).toBeCloseTo(1.2, 1);
    expect(mod.AVATAR_BODY.depth).toBeCloseTo(0.4, 1);
  });

  it('should export AVATAR_HEAD dimensions', async () => {
    const mod = await import('../AgentAvatar');
    expect(mod.AVATAR_HEAD).toBeDefined();
    expect(mod.AVATAR_HEAD.radius).toBeCloseTo(0.25, 1);
  });
});
