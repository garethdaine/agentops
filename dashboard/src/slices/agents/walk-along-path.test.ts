import { describe, it, expect, vi } from 'vitest';
import {
  createPathWalker,
  type PathWalker,
  type PathWalkerConfig,
} from './walk-along-path';

describe('createPathWalker', () => {
  const defaultConfig: PathWalkerConfig = {
    walkSpeed: 2.5,
    arrivalThreshold: 0.15,
  };

  function makePath() {
    return [
      { x: 0, z: 0 },
      { x: 3, z: 0 },
      { x: 3, z: 4 },
    ];
  }

  it('should start at path index 0 when given a path', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPath(makePath());
    expect(walker.isWalking).toBe(true);
    expect(walker.pathIndex).toBe(0);
  });

  it('should return isWalking=false with no path', () => {
    const walker = createPathWalker(defaultConfig);
    expect(walker.isWalking).toBe(false);
  });

  it('should interpolate position toward first waypoint on tick', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPath(makePath());
    walker.setPosition({ x: 0, z: 0 });
    const result = walker.tick(0.5); // 0.5s at 2.5 u/s = 1.25 units
    expect(result.position.x).toBeCloseTo(1.25, 1);
    expect(result.position.z).toBeCloseTo(0, 1);
  });

  it('should advance to next waypoint when within arrival threshold', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPath([{ x: 0.1, z: 0 }, { x: 5, z: 0 }]);
    walker.setPosition({ x: 0, z: 0 });
    walker.tick(0.1); // Move to within 0.15 of first waypoint
    expect(walker.pathIndex).toBe(1);
  });

  it('should set isWalking=false and call onArrive when path is complete', () => {
    const onArrive = vi.fn();
    const walker = createPathWalker(defaultConfig);
    walker.onArrive = onArrive;
    walker.setPath([{ x: 0.1, z: 0 }]);
    walker.setPosition({ x: 0, z: 0 });
    walker.tick(0.1);
    expect(walker.isWalking).toBe(false);
    expect(onArrive).toHaveBeenCalledOnce();
  });

  it('should compute facing direction (rotation.y) toward target', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPath([{ x: 5, z: 0 }]);
    walker.setPosition({ x: 0, z: 0 });
    const result = walker.tick(0.1);
    // atan2(dx, dz) = atan2(5, 0) = PI/2
    expect(result.rotationY).toBeCloseTo(Math.atan2(5, 0), 1);
  });

  it('should handle path interruption from current position', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPath([{ x: 10, z: 0 }]);
    walker.setPosition({ x: 0, z: 0 });
    walker.tick(1.0); // Now at roughly (2.5, 0)
    // Interrupt with new path
    walker.setPath([{ x: 2.5, z: 5 }]);
    expect(walker.isWalking).toBe(true);
    expect(walker.pathIndex).toBe(0);
  });

  it('should skip waypoints that are already behind the current position', () => {
    const walker = createPathWalker(defaultConfig);
    walker.setPosition({ x: 3, z: 0 });
    walker.setPath([
      { x: 0, z: 0 },   // behind current pos — should skip
      { x: 3, z: 0 },   // at current pos — should skip
      { x: 6, z: 0 },   // ahead — first real target
    ]);
    // Waypoints within 0.1 of current position are filtered
    expect(walker.pathIndex).toBe(0);
    const result = walker.tick(0.1);
    expect(result.position.x).toBeGreaterThan(3);
  });

  it('should clamp step distance to remaining distance', () => {
    const walker = createPathWalker({ walkSpeed: 100, arrivalThreshold: 0.15 });
    walker.setPath([{ x: 1, z: 0 }]);
    walker.setPosition({ x: 0, z: 0 });
    const result = walker.tick(1.0); // 100 u/s * 1s = 100 units, but target is 1 unit away
    expect(result.position.x).toBeCloseTo(1, 1);
  });
});

describe('zone reassignment triggers pathfinding', () => {
  it('should produce a path when assignAgentToZone is called', async () => {
    // This test validates the integration contract
    const { findPath, getZoneEntryPoint } = await import('./pathfinding/waypoint-graph');
    const from = { x: 0, z: -2.5 };
    const toZone = 'breakRoom';
    const target = getZoneEntryPoint(toZone);
    const path = findPath(from, target);
    expect(path.length).toBeGreaterThan(1);
  });
});
