import { describe, it, expect } from 'vitest';
import {
  PLANT_POSITIONS,
  EQUIPMENT_POSITIONS,
  DESK_CLUTTER_CONFIG,
} from '@/lib/decoration-layout';

describe('decoration layout', () => {
  describe('floor plants', () => {
    it('should define 6 plant positions', () => {
      expect(PLANT_POSITIONS).toHaveLength(6);
    });

    it('should include height variance for each plant', () => {
      PLANT_POSITIONS.forEach((plant) => {
        expect(plant.x).toBeDefined();
        expect(plant.z).toBeDefined();
        expect(plant.height).toBeGreaterThan(0);
        expect(plant.height).toBeLessThanOrEqual(1.5);
      });
    });

    it('should position plants at zone edges (not inside zones)', () => {
      PLANT_POSITIONS.forEach((plant) => {
        // Plants are typically at x < -7 or x > 12 or z extremes
        const isEdge = Math.abs(plant.x) > 7 || Math.abs(plant.z) > 4;
        expect(isEdge).toBe(true);
      });
    });
  });

  describe('equipment', () => {
    it('should define water cooler, photocopier, printer, and trash bins', () => {
      const types = EQUIPMENT_POSITIONS.map((e) => e.type);
      expect(types).toContain('waterCooler');
      expect(types).toContain('photocopier');
      expect(types).toContain('printer');
      expect(types.filter((t) => t === 'trashBin')).toHaveLength(2);
    });

    it('should have 5 total equipment items', () => {
      expect(EQUIPMENT_POSITIONS).toHaveLength(5);
    });
  });

  describe('desk clutter configuration', () => {
    it('should place keyboards on all 9 workstations', () => {
      expect(DESK_CLUTTER_CONFIG.keyboardOnAll).toBe(true);
    });

    it('should configure ~40% coffee cup distribution', () => {
      expect(DESK_CLUTTER_CONFIG.coffeeCupChance).toBeCloseTo(0.4, 1);
    });

    it('should configure ~35% paper stack distribution', () => {
      expect(DESK_CLUTTER_CONFIG.paperStackChance).toBeCloseTo(0.35, 2);
    });

    it('should use deterministic distribution (not Math.random)', () => {
      expect(DESK_CLUTTER_CONFIG.deterministic).toBe(true);
    });
  });
});

describe('desk clutter deterministic distribution', () => {
  it('should produce roughly 40% coffee cups across 9 desks', async () => {
    const { computeClutterItems } = await import('@/lib/decoration-layout');
    const items = computeClutterItems(9);
    const cups = items.filter((i) => i.type === 'coffeeCup');
    // 40% of 9 = 3.6, expect 3-4
    expect(cups.length).toBeGreaterThanOrEqual(2);
    expect(cups.length).toBeLessThanOrEqual(5);
  });

  it('should produce roughly 35% paper stacks across 9 desks', async () => {
    const { computeClutterItems } = await import('@/lib/decoration-layout');
    const items = computeClutterItems(9);
    const papers = items.filter((i) => i.type === 'paperStack');
    // 35% of 9 = 3.15, expect 2-4
    expect(papers.length).toBeGreaterThanOrEqual(2);
    expect(papers.length).toBeLessThanOrEqual(5);
  });

  it('should include a keyboard for every desk', async () => {
    const { computeClutterItems } = await import('@/lib/decoration-layout');
    const items = computeClutterItems(9);
    const keyboards = items.filter((i) => i.type === 'keyboard');
    expect(keyboards).toHaveLength(9);
  });
});
