import { describe, it, expect } from 'vitest';
import {
  WALL_DECORATION_ITEMS,
} from '@/lib/wall-decoration-layout';
import { FLOOR_WIDTH, FLOOR_DEPTH } from '@/lib/floorplan';

describe('wall decoration layout', () => {
  const halfW = FLOOR_WIDTH / 2 + 0.5;  // wall offset at ±14.5
  const halfD = FLOOR_DEPTH / 2 + 0.5;  // wall offset at ±11.5

  it('should define decorations for all 4 walls', () => {
    const walls = new Set(WALL_DECORATION_ITEMS.map((d) => d.wall));
    expect(walls).toEqual(new Set(['north', 'south', 'east', 'west']));
  });

  it('should include pictures, posters, TV, and clocks', () => {
    const types = new Set(WALL_DECORATION_ITEMS.map((d) => d.type));
    expect(types).toContain('picture');
    expect(types).toContain('poster');
    expect(types).toContain('tv');
    expect(types).toContain('clock');
  });

  describe('north wall decorations', () => {
    it('should have 4 items (3 pictures + 1 clock)', () => {
      const north = WALL_DECORATION_ITEMS.filter((d) => d.wall === 'north');
      expect(north).toHaveLength(4);
    });
  });

  describe('south wall decorations', () => {
    it('should have 3 items (2 posters + 1 TV)', () => {
      const south = WALL_DECORATION_ITEMS.filter((d) => d.wall === 'south');
      expect(south).toHaveLength(3);
    });
  });

  describe('east wall decorations', () => {
    it('should have 3 items (2 pictures + 1 poster)', () => {
      const east = WALL_DECORATION_ITEMS.filter((d) => d.wall === 'east');
      expect(east).toHaveLength(3);
    });
  });

  describe('west wall decorations', () => {
    it('should have 3 items (1 TV + 1 poster + 1 clock)', () => {
      const west = WALL_DECORATION_ITEMS.filter((d) => d.wall === 'west');
      expect(west).toHaveLength(3);
    });
  });

  it('should position all decorations between floor and ceiling (y: 1.5-2.8)', () => {
    WALL_DECORATION_ITEMS.forEach((d) => {
      expect(d.y).toBeGreaterThanOrEqual(1.5);
      expect(d.y).toBeLessThanOrEqual(2.8);
    });
  });

  it('should face decorations inward (correct rotation per wall)', () => {
    WALL_DECORATION_ITEMS.forEach((d) => {
      switch (d.wall) {
        case 'north':
          expect(d.rotationY).toBeCloseTo(0, 2);
          break;
        case 'south':
          expect(d.rotationY).toBeCloseTo(Math.PI, 2);
          break;
        case 'east':
          expect(d.rotationY).toBeCloseTo(-Math.PI / 2, 2);
          break;
        case 'west':
          expect(d.rotationY).toBeCloseTo(Math.PI / 2, 2);
          break;
      }
    });
  });
});
