import { describe, it, expect } from 'vitest';
import {
  calculateWorkstationSlots,
  expandWorkstationGrid,
  type WorkstationSlot,
} from '../dynamic-workstations';

describe('Dynamic Workstations', () => {
  describe('calculateWorkstationSlots', () => {
    it('should return base 9 slots when agent count is 9 or fewer', () => {
      expect(calculateWorkstationSlots(5)).toBe(9);
      expect(calculateWorkstationSlots(9)).toBe(9);
    });

    it('should expand to match agent count when exceeding 9', () => {
      expect(calculateWorkstationSlots(12)).toBe(12);
      expect(calculateWorkstationSlots(15)).toBe(15);
    });

    it('should round up to nearest row of 3 for tidy grid', () => {
      expect(calculateWorkstationSlots(10)).toBe(12);
      expect(calculateWorkstationSlots(13)).toBe(15);
    });

    it('should handle zero agents by returning base 9', () => {
      expect(calculateWorkstationSlots(0)).toBe(9);
    });

    it('should cap at maximum 24 workstations', () => {
      expect(calculateWorkstationSlots(30)).toBe(24);
    });
  });

  describe('expandWorkstationGrid', () => {
    it('should return 9 positions for base layout', () => {
      const slots = expandWorkstationGrid(9);
      expect(slots).toHaveLength(9);
    });

    it('should return expanded positions for larger count', () => {
      const slots = expandWorkstationGrid(12);
      expect(slots).toHaveLength(12);
    });

    it('should maintain consistent spacing between slots', () => {
      const slots = expandWorkstationGrid(12);
      const xSpacings = new Set<number>();
      const zSpacings = new Set<number>();

      for (let i = 1; i < slots.length; i++) {
        const dx = Math.abs(slots[i].position[0] - slots[i - 1].position[0]);
        const dz = Math.abs(slots[i].position[2] - slots[i - 1].position[2]);
        if (dx > 0.1) xSpacings.add(Math.round(dx * 100) / 100);
        if (dz > 0.1) zSpacings.add(Math.round(dz * 100) / 100);
      }
      // Should have at most 2 unique spacings (within-row and between-row)
      expect(xSpacings.size).toBeLessThanOrEqual(2);
    });

    it('should keep all positions within workstation zone bounds', () => {
      const slots = expandWorkstationGrid(24);
      for (const slot of slots) {
        expect(slot.position[0]).toBeGreaterThan(-15);
        expect(slot.position[0]).toBeLessThan(15);
        expect(slot.position[2]).toBeGreaterThan(-12);
        expect(slot.position[2]).toBeLessThan(12);
      }
    });

    it('should assign unique indices to each slot', () => {
      const slots = expandWorkstationGrid(15);
      const indices = slots.map(s => s.index);
      expect(new Set(indices).size).toBe(15);
    });
  });
});
