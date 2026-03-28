import { describe, it, expect } from 'vitest';
import {
  WALL_PARTITIONS,
  FLOOR_WIDTH,
  FLOOR_DEPTH,
  WALL_HEIGHT,
  WINDOW_OPENINGS,
  DOOR_OPENING,
  GLASS_PARTITIONS,
} from '@/lib/floorplan';

describe('OfficeWalls configuration', () => {
  describe('wall height', () => {
    it('should use 3.2m wall height', () => {
      expect(WALL_HEIGHT).toBe(3.2);
    });
  });

  describe('perimeter walls', () => {
    it('should have 4 perimeter wall segments (N, S, E, W)', () => {
      const perimeterWalls = WALL_PARTITIONS.filter(
        (w) => w.type === 'perimeter'
      );
      // More segments due to window/door gaps, but 4 wall sides
      const sides = new Set(perimeterWalls.map((w) => w.side));
      expect(sides.size).toBe(4);
    });

    it('should span the full 28x22 floor dimensions', () => {
      const halfW = FLOOR_WIDTH / 2;
      const halfD = FLOOR_DEPTH / 2;
      const perimeterWalls = WALL_PARTITIONS.filter(
        (w) => w.type === 'perimeter'
      );

      const northWalls = perimeterWalls.filter((w) => w.side === 'north');
      const southWalls = perimeterWalls.filter((w) => w.side === 'south');

      // North and south walls exist
      expect(northWalls.length).toBeGreaterThan(0);
      expect(southWalls.length).toBeGreaterThan(0);

      // Wall z positions match floor edges
      northWalls.forEach((w) => {
        expect(w.position[2]).toBeCloseTo(-halfD, 0);
      });
      southWalls.forEach((w) => {
        expect(w.position[2]).toBeCloseTo(halfD, 0);
      });
    });
  });

  describe('window openings', () => {
    it('should define 4 north windows', () => {
      const northWindows = WINDOW_OPENINGS.filter((w) => w.wall === 'north');
      expect(northWindows).toHaveLength(4);
    });

    it('should define 3 east windows', () => {
      const eastWindows = WINDOW_OPENINGS.filter((w) => w.wall === 'east');
      expect(eastWindows).toHaveLength(3);
    });

    it('should define 4 south windows', () => {
      const southWindows = WINDOW_OPENINGS.filter((w) => w.wall === 'south');
      expect(southWindows).toHaveLength(4);
    });

    it('should have window height of 1.5m at y=1.8m', () => {
      WINDOW_OPENINGS.forEach((win) => {
        expect(win.height).toBeCloseTo(1.5, 1);
        expect(win.centerY).toBeCloseTo(1.8, 1);
      });
    });
  });

  describe('door opening', () => {
    it('should define a south wall door at x=12', () => {
      expect(DOOR_OPENING).toBeDefined();
      expect(DOOR_OPENING.wall).toBe('south');
      expect(DOOR_OPENING.centerX).toBeCloseTo(12, 0);
    });

    it('should have door dimensions 1.3m wide x 2.5m tall', () => {
      expect(DOOR_OPENING.width).toBeCloseTo(1.3, 1);
      expect(DOOR_OPENING.height).toBeCloseTo(2.5, 1);
    });
  });

  describe('glass partitions', () => {
    it('should define interior glass partitions between zones', () => {
      expect(GLASS_PARTITIONS.length).toBeGreaterThanOrEqual(5);
    });

    it('should mark partitions as glass or solid', () => {
      GLASS_PARTITIONS.forEach((p) => {
        expect(typeof p.glass).toBe('boolean');
      });
    });

    it('should have at least one solid partition (server room)', () => {
      const solidPartitions = GLASS_PARTITIONS.filter((p) => !p.glass);
      expect(solidPartitions.length).toBeGreaterThanOrEqual(1);
    });
  });
});
