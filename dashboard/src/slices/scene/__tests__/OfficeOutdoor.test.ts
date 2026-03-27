import { describe, it, expect } from 'vitest';
import {
  PARKING_LOT,
  CAR_POSITIONS,
  FLOWER_BED_POSITIONS,
  OUTDOOR_BENCH_POSITIONS,
  LAMP_POST_POSITIONS,
  BOLLARD_POSITIONS,
  WALKWAY,
} from '@/lib/outdoor-layout';
import { FLOOR_WIDTH, FLOOR_DEPTH } from '@/lib/floorplan';

describe('outdoor layout', () => {
  describe('parking lot', () => {
    it('should define a 16x14 parking lot', () => {
      expect(PARKING_LOT.width).toBe(16);
      expect(PARKING_LOT.depth).toBe(14);
    });

    it('should position parking lot east of the building', () => {
      expect(PARKING_LOT.centerX).toBeGreaterThan(FLOOR_WIDTH / 2);
    });

    it('should define parking line markings', () => {
      expect(PARKING_LOT.lineCount).toBe(5);
      expect(PARKING_LOT.lineSpacing).toBeCloseTo(3.5, 1);
    });
  });

  describe('cars', () => {
    it('should define 4 cars in a 2x2 grid', () => {
      expect(CAR_POSITIONS).toHaveLength(4);
    });

    it('should position all cars within parking lot bounds', () => {
      const lotLeft = PARKING_LOT.centerX - PARKING_LOT.width / 2;
      const lotRight = PARKING_LOT.centerX + PARKING_LOT.width / 2;
      const lotFront = PARKING_LOT.centerZ - PARKING_LOT.depth / 2;
      const lotBack = PARKING_LOT.centerZ + PARKING_LOT.depth / 2;

      CAR_POSITIONS.forEach((car) => {
        expect(car.x).toBeGreaterThanOrEqual(lotLeft);
        expect(car.x).toBeLessThanOrEqual(lotRight);
        expect(car.z).toBeGreaterThanOrEqual(lotFront);
        expect(car.z).toBeLessThanOrEqual(lotBack);
      });
    });

    it('should assign different colors to each car', () => {
      const colors = CAR_POSITIONS.map((c) => c.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });

  describe('flower beds', () => {
    it('should define flower beds along north and south walls', () => {
      expect(FLOWER_BED_POSITIONS.length).toBeGreaterThanOrEqual(5);
    });

    it('should position north flower beds outside building north edge', () => {
      const northBeds = FLOWER_BED_POSITIONS.filter(
        (b) => b.z < -FLOOR_DEPTH / 2
      );
      expect(northBeds.length).toBeGreaterThanOrEqual(3);
    });

    it('should position south flower beds near door area', () => {
      const southBeds = FLOWER_BED_POSITIONS.filter(
        (b) => b.z > FLOOR_DEPTH / 2
      );
      expect(southBeds.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('outdoor benches', () => {
    it('should define 2 outdoor benches', () => {
      expect(OUTDOOR_BENCH_POSITIONS).toHaveLength(2);
    });

    it('should position benches outside building bounds', () => {
      OUTDOOR_BENCH_POSITIONS.forEach((bench) => {
        const outsideX = Math.abs(bench.x) > FLOOR_WIDTH / 2;
        const outsideZ = Math.abs(bench.z) > FLOOR_DEPTH / 2;
        expect(outsideX || outsideZ).toBe(true);
      });
    });
  });

  describe('lamp posts', () => {
    it('should define 3 lamp posts', () => {
      expect(LAMP_POST_POSITIONS).toHaveLength(3);
    });
  });

  describe('bollards', () => {
    it('should define 4 bollards marking parking boundary', () => {
      expect(BOLLARD_POSITIONS).toHaveLength(4);
    });

    it('should position bollards along a line (same x)', () => {
      const xs = BOLLARD_POSITIONS.map((b) => b.x);
      const sameX = xs.every((x) => Math.abs(x - xs[0]) < 0.5);
      expect(sameX).toBe(true);
    });
  });

  describe('walkway', () => {
    it('should connect door to parking area', () => {
      expect(WALKWAY).toBeDefined();
      expect(WALKWAY.width).toBeCloseTo(3, 0);
      expect(WALKWAY.depth).toBeCloseTo(4, 0);
    });
  });
});
