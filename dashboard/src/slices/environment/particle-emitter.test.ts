import { describe, it, expect, beforeEach } from 'vitest';
import {
  createParticlePool,
  type ParticlePool,
  type Particle,
  POOL_SIZE,
  PRESETS,
  emitParticles,
  updateParticles,
} from './ParticleEmitter';

describe('POOL_SIZE', () => {
  it('should be 100', () => {
    expect(POOL_SIZE).toBe(100);
  });
});

describe('PRESETS', () => {
  it('should define success preset: green, 12 count, 1.2s lifetime', () => {
    expect(PRESETS.success.color).toBe(0x22c55e);
    expect(PRESETS.success.count).toBe(12);
    expect(PRESETS.success.lifetime).toBeCloseTo(1.2);
  });

  it('should define failure preset: red, 8 count, 1.0s lifetime', () => {
    expect(PRESETS.failure.color).toBe(0xef4444);
    expect(PRESETS.failure.count).toBe(8);
    expect(PRESETS.failure.lifetime).toBeCloseTo(1.0);
  });

  it('should define memory preset: purple, 6 count, 2.0s lifetime', () => {
    expect(PRESETS.memory.color).toBe(0x8b5cf6);
    expect(PRESETS.memory.count).toBe(6);
    expect(PRESETS.memory.lifetime).toBeCloseTo(2.0);
  });
});

describe('createParticlePool', () => {
  let pool: ParticlePool;

  beforeEach(() => {
    pool = createParticlePool();
  });

  it('should pre-allocate pool of 100 particles', () => {
    expect(pool.capacity).toBe(100);
  });

  it('should start with 0 active particles', () => {
    expect(pool.activeCount).toBe(0);
  });

  it('should acquire a particle from the pool', () => {
    const p = pool.acquire();
    expect(p).toBeTruthy();
    expect(pool.activeCount).toBe(1);
  });

  it('should release a particle back to the pool', () => {
    const p = pool.acquire()!;
    pool.release(p);
    expect(pool.activeCount).toBe(0);
  });

  it('should return null when pool is exhausted', () => {
    for (let i = 0; i < 100; i++) pool.acquire();
    const p = pool.acquire();
    expect(p).toBeNull();
  });
});

describe('emitParticles', () => {
  let pool: ParticlePool;

  beforeEach(() => {
    pool = createParticlePool();
  });

  it('should activate correct number of particles for success preset', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    expect(active).toHaveLength(12);
    expect(pool.activeCount).toBe(12);
  });

  it('should set particle color from preset', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.failure);
    active.forEach((p) => {
      expect(p.color).toBe(0xef4444);
    });
  });

  it('should set particle position near emission point', () => {
    const active = emitParticles(pool, { x: 5, y: 2, z: 3 }, PRESETS.success);
    active.forEach((p) => {
      expect(Math.abs(p.position.x - 5)).toBeLessThan(1);
      expect(Math.abs(p.position.z - 3)).toBeLessThan(1);
    });
  });

  it('should set upward velocity bias', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    active.forEach((p) => {
      expect(p.velocity.y).toBeGreaterThan(0);
    });
  });

  it('should set lifetime from preset', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.memory);
    active.forEach((p) => {
      expect(p.lifetime).toBeCloseTo(2.0);
    });
  });
});

describe('updateParticles', () => {
  let pool: ParticlePool;

  beforeEach(() => {
    pool = createParticlePool();
  });

  it('should advance particle age by delta', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    updateParticles(active, pool, 0.5);
    active.forEach((p) => {
      expect(p.age).toBeCloseTo(0.5);
    });
  });

  it('should apply gravity (velocity.y decreases)', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    const initialVy = active[0].velocity.y;
    updateParticles(active, pool, 0.1);
    expect(active[0].velocity.y).toBeLessThan(initialVy);
  });

  it('should fade opacity as age approaches lifetime', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    updateParticles(active, pool, 0.6); // 50% of 1.2s lifetime
    active.forEach((p) => {
      expect(p.opacity).toBeLessThan(1);
      expect(p.opacity).toBeGreaterThan(0);
    });
  });

  it('should release particles that exceed lifetime', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    const before = pool.activeCount;
    updateParticles(active, pool, 1.3); // past 1.2s lifetime
    expect(pool.activeCount).toBeLessThan(before);
  });

  it('should shrink particle scale as age progresses', () => {
    const active = emitParticles(pool, { x: 0, y: 1, z: 0 }, PRESETS.success);
    updateParticles(active, pool, 0.6);
    active.forEach((p) => {
      expect(p.scale).toBeLessThan(1);
      expect(p.scale).toBeGreaterThan(0);
    });
  });
});
