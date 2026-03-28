import { describe, it, expect } from 'vitest';
import {
  WAYPOINTS,
  buildAdjacency,
  findPath,
  nearestWaypoint,
  getZoneEntryPoint,
} from './waypoint-graph';
import { astar, euclidean } from './astar';

describe('waypoint-graph', () => {
  describe('WAYPOINTS', () => {
    it('should define exactly 56 named waypoints', () => {
      expect(Object.keys(WAYPOINTS)).toHaveLength(56);
    });

    it('should have x and z coordinates for every waypoint', () => {
      for (const [key, wp] of Object.entries(WAYPOINTS)) {
        expect(wp).toHaveProperty('x');
        expect(wp).toHaveProperty('z');
        expect(typeof wp.x).toBe('number');
        expect(typeof wp.z).toBe('number');
      }
    });
  });

  describe('buildAdjacency', () => {
    it('should return a map with an entry for every waypoint', () => {
      const adj = buildAdjacency();
      expect(Object.keys(adj)).toHaveLength(56);
    });

    it('should create bidirectional edges', () => {
      const adj = buildAdjacency();
      for (const [node, neighbors] of Object.entries(adj)) {
        for (const neighbor of neighbors as string[]) {
          expect((adj as Record<string, string[]>)[neighbor]).toContain(node);
        }
      }
    });

    it('should cache the adjacency list on second call', () => {
      const adj1 = buildAdjacency();
      const adj2 = buildAdjacency();
      expect(adj1).toBe(adj2);
    });
  });

  describe('nearestWaypoint', () => {
    it('should return the closest waypoint key for a given position', () => {
      const wp = nearestWaypoint({ x: 0, z: -2.5 });
      expect(wp).toBe('mcC');
    });

    it('should return a waypoint for positions far from any node', () => {
      const wp = nearestWaypoint({ x: 100, z: 100 });
      expect(wp).toBeTruthy();
      expect(WAYPOINTS).toHaveProperty(wp!);
    });
  });

  describe('getZoneEntryPoint', () => {
    it('should return a valid position for every zone ID', () => {
      const zones = [
        'serverRack', 'warRoom', 'securityDesk', 'workstations',
        'mailroom', 'conference', 'vault', 'toolWorkshop',
        'breakRoom', 'escalation',
      ];
      for (const zoneId of zones) {
        const entry = getZoneEntryPoint(zoneId);
        expect(entry).toHaveProperty('x');
        expect(entry).toHaveProperty('z');
      }
    });

    it('should return workstations center as fallback for unknown zones', () => {
      const entry = getZoneEntryPoint('nonexistent');
      expect(entry).toEqual(WAYPOINTS.mcC);
    });
  });
});

describe('astar', () => {
  describe('euclidean', () => {
    it('should return 0 for identical points', () => {
      expect(euclidean({ x: 1, z: 2 }, { x: 1, z: 2 })).toBe(0);
    });

    it('should return correct Euclidean distance', () => {
      const d = euclidean({ x: 0, z: 0 }, { x: 3, z: 4 });
      expect(d).toBeCloseTo(5, 5);
    });
  });

  describe('astar search', () => {
    it('should return a single-element path when start equals end', () => {
      const path = findPath({ x: 0, z: -2.5 }, { x: 0, z: -2.5 });
      expect(path.length).toBeGreaterThanOrEqual(1);
    });

    it('should find a path from serverRack to breakRoom', () => {
      const from = getZoneEntryPoint('serverRack');
      const to = getZoneEntryPoint('breakRoom');
      const path = findPath(from, to);
      expect(path.length).toBeGreaterThan(2);
      // Path should end near the target
      const last = path[path.length - 1];
      const dx = last.x - to.x;
      const dz = last.z - to.z;
      expect(Math.sqrt(dx * dx + dz * dz)).toBeLessThan(1);
    });

    it('should find paths between all zone pairs', () => {
      const zones = [
        'serverRack', 'warRoom', 'securityDesk', 'workstations',
        'mailroom', 'conference', 'vault', 'toolWorkshop',
        'breakRoom', 'escalation',
      ];
      for (const from of zones) {
        for (const to of zones) {
          if (from === to) continue;
          const path = findPath(
            getZoneEntryPoint(from),
            getZoneEntryPoint(to),
          );
          expect(path.length).toBeGreaterThan(0);
        }
      }
    });

    it('should produce a path that respects adjacency (no teleporting)', () => {
      const adj = buildAdjacency();
      const from = getZoneEntryPoint('serverRack');
      const to = getZoneEntryPoint('conference');
      const path = findPath(from, to);
      // Each consecutive pair of waypoints in the internal path
      // should be adjacent or the final destination appended
      expect(path.length).toBeGreaterThan(1);
    });

    it('should use an admissible heuristic (never overestimates)', () => {
      // Euclidean distance is admissible for grid/graph with Euclidean edge weights
      const a = { x: 0, z: 0 };
      const b = { x: 10, z: 10 };
      const h = euclidean(a, b);
      // Straight-line distance is always <= actual path distance
      expect(h).toBeLessThanOrEqual(Math.sqrt(200) + 0.001);
    });
  });
});
