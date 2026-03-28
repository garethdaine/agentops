import { describe, it, expect } from 'vitest';
import {
  FLOOR_WIDTH,
  FLOOR_DEPTH,
  ZONES,
  ZONE_TINTS,
  WORKSTATION_SLOTS,
  createWorkstations,
} from '../floorplan';

describe('floorplan', () => {
  describe('floor dimensions', () => {
    it('should have floor width of 28', () => {
      expect(FLOOR_WIDTH).toBe(28);
    });

    it('should have floor depth of 22', () => {
      expect(FLOOR_DEPTH).toBe(22);
    });
  });

  describe('zones', () => {
    it('should define exactly 10 zones', () => {
      expect(ZONES).toHaveLength(10);
    });

    const expectedZoneIds = [
      'serverRack', 'warRoom', 'securityDesk', 'workstations',
      'mailroom', 'conference', 'vault', 'toolWorkshop',
      'breakRoom', 'escalation',
    ];

    it.each(expectedZoneIds)('should include zone "%s"', (id) => {
      const zone = ZONES.find((z) => z.id === id);
      expect(zone).toBeDefined();
      expect(zone!.position).toHaveProperty('x');
      expect(zone!.position).toHaveProperty('z');
      expect(zone!.size).toHaveProperty('width');
      expect(zone!.size).toHaveProperty('depth');
    });

    it('should have a tint color for every zone', () => {
      ZONES.forEach((zone) => {
        expect(ZONE_TINTS[zone.id]).toBeDefined();
        expect(typeof ZONE_TINTS[zone.id]).toBe('string');
      });
    });

    it('should match reference zone positions', () => {
      const ref: Record<string, { cx: number; cz: number; w: number; d: number }> = {
        serverRack:   { cx: -10.5, cz: -8.5, w: 5,  d: 3 },
        warRoom:      { cx: 1,     cz: -8.5, w: 18, d: 3 },
        securityDesk: { cx: -11,   cz: -3.5, w: 4,  d: 5 },
        workstations: { cx: 2,     cz: -2.5, w: 22, d: 7 },
        mailroom:     { cx: -11,   cz: 3,    w: 4,  d: 4 },
        conference:   { cx: -2,    cz: 7,    w: 12, d: 4 },
        vault:        { cx: 10,    cz: 6,    w: 6,  d: 3 },
        toolWorkshop: { cx: -10,   cz: 7,    w: 6,  d: 4 },
        breakRoom:    { cx: 10,    cz: 9.5,  w: 6,  d: 3 },
        escalation:   { cx: -8,    cz: 1,    w: 2,  d: 2 },
      };

      Object.entries(ref).forEach(([id, expected]) => {
        const zone = ZONES.find((z) => z.id === id)!;
        expect(zone.position.x).toBeCloseTo(expected.cx, 1);
        expect(zone.position.z).toBeCloseTo(expected.cz, 1);
        expect(zone.size.width).toBeCloseTo(expected.w, 1);
        expect(zone.size.depth).toBeCloseTo(expected.d, 1);
      });
    });
  });

  describe('workstation slots', () => {
    it('should define exactly 9 workstation slots', () => {
      expect(WORKSTATION_SLOTS).toHaveLength(9);
    });

    it('should position all slots within workstations zone bounds', () => {
      const wsZone = ZONES.find((z) => z.id === 'workstations')!;
      const halfW = wsZone.size.width / 2;
      const halfD = wsZone.size.depth / 2;

      WORKSTATION_SLOTS.forEach((slot) => {
        expect(slot.position[0]).toBeGreaterThanOrEqual(wsZone.position.x - halfW);
        expect(slot.position[0]).toBeLessThanOrEqual(wsZone.position.x + halfW);
        expect(slot.position[2]).toBeGreaterThanOrEqual(wsZone.position.z - halfD);
        expect(slot.position[2]).toBeLessThanOrEqual(wsZone.position.z + halfD);
      });
    });
  });

  describe('createWorkstations', () => {
    it('should create 9 workstation objects from slots', () => {
      const workstations = createWorkstations();
      expect(workstations).toHaveLength(9);
      workstations.forEach((ws, i) => {
        expect(ws.index).toBe(i);
        expect(ws.occupied).toBe(false);
      });
    });
  });
});
