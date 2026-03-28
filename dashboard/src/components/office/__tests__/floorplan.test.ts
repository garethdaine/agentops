import { describe, it, expect } from 'vitest';
import {
  ZONES,
  WORKSTATION_SLOTS,
  WALL_PARTITIONS,
  FLOOR_WIDTH,
  FLOOR_DEPTH,
  ZONE_TINTS,
  BASE_FLOOR_COLOR,
  createWorkstations,
} from '@/lib/floorplan';

describe('floorplan', () => {
  describe('ZONES', () => {
    it('should define at least 3 zones', () => {
      expect(ZONES.length).toBeGreaterThanOrEqual(3);
    });

    it('should include a workstations zone', () => {
      const ws = ZONES.find((z) => z.id === 'workstations');
      expect(ws).toBeDefined();
      expect(ws!.name).toBe('Workstations');
    });

    it('should have position and size for each zone', () => {
      ZONES.forEach((zone) => {
        expect(zone.position).toHaveProperty('x');
        expect(zone.position).toHaveProperty('y');
        expect(zone.position).toHaveProperty('z');
        expect(zone.size).toHaveProperty('width');
        expect(zone.size).toHaveProperty('depth');
        expect(zone.size.width).toBeGreaterThan(0);
        expect(zone.size.depth).toBeGreaterThan(0);
      });
    });
  });

  describe('ZONE_TINTS', () => {
    it('should have a tint for each zone', () => {
      ZONES.forEach((zone) => {
        expect(ZONE_TINTS[zone.id]).toBeDefined();
        expect(ZONE_TINTS[zone.id]).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('BASE_FLOOR_COLOR', () => {
    it('should be a valid hex color', () => {
      expect(BASE_FLOOR_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('FLOOR_WIDTH and FLOOR_DEPTH', () => {
    it('should be positive numbers', () => {
      expect(FLOOR_WIDTH).toBeGreaterThan(0);
      expect(FLOOR_DEPTH).toBeGreaterThan(0);
    });
  });

  describe('WORKSTATION_SLOTS', () => {
    it('should define 4-12 workstation positions', () => {
      expect(WORKSTATION_SLOTS.length).toBeGreaterThanOrEqual(4);
      expect(WORKSTATION_SLOTS.length).toBeLessThanOrEqual(12);
    });

    it('should have position as [x, y, z] tuple and rotation', () => {
      WORKSTATION_SLOTS.forEach((slot) => {
        expect(slot.position).toHaveLength(3);
        expect(typeof slot.position[0]).toBe('number');
        expect(typeof slot.position[1]).toBe('number');
        expect(typeof slot.position[2]).toBe('number');
        expect(typeof slot.rotation).toBe('number');
      });
    });

    it('should have unique positions', () => {
      const keys = WORKSTATION_SLOTS.map((s) => s.position.join(','));
      const unique = new Set(keys);
      expect(unique.size).toBe(WORKSTATION_SLOTS.length);
    });
  });

  describe('WALL_PARTITIONS', () => {
    it('should define at least 2 wall partitions', () => {
      expect(WALL_PARTITIONS.length).toBeGreaterThanOrEqual(2);
    });

    it('should have position, size, and rotation', () => {
      WALL_PARTITIONS.forEach((p) => {
        expect(p.position).toHaveLength(3);
        expect(p.size).toHaveLength(3);
        expect(typeof p.rotation).toBe('number');
      });
    });
  });

  describe('createWorkstations', () => {
    it('should create workstation objects from slots', () => {
      const workstations = createWorkstations();
      expect(workstations).toHaveLength(WORKSTATION_SLOTS.length);
    });

    it('should set index, position, rotation, and occupied=false', () => {
      const workstations = createWorkstations();
      workstations.forEach((ws, i) => {
        expect(ws.index).toBe(i);
        expect(ws.position.x).toBe(WORKSTATION_SLOTS[i].position[0]);
        expect(ws.position.y).toBe(WORKSTATION_SLOTS[i].position[1]);
        expect(ws.position.z).toBe(WORKSTATION_SLOTS[i].position[2]);
        expect(ws.rotation).toBe(WORKSTATION_SLOTS[i].rotation);
        expect(ws.occupied).toBe(false);
      });
    });
  });
});
