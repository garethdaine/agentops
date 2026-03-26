import { describe, it, expect } from 'vitest';
import {
  DESK,
  MONITOR,
  MONITOR_CANVAS,
  LAMP,
  STATUS_COLORS,
  PARTITION,
  CODE_PALETTES,
} from '@/lib/furniture-geometry';

describe('furniture-geometry', () => {
  describe('DESK', () => {
    it('should have positive dimensions', () => {
      expect(DESK.width).toBeGreaterThan(0);
      expect(DESK.height).toBeGreaterThan(0);
      expect(DESK.depth).toBeGreaterThan(0);
      expect(DESK.surfaceY).toBeGreaterThan(0);
    });

    it('should have a surface height around desk level', () => {
      expect(DESK.surfaceY).toBeGreaterThan(0.5);
      expect(DESK.surfaceY).toBeLessThan(1.2);
    });
  });

  describe('MONITOR', () => {
    it('should have positive dimensions', () => {
      expect(MONITOR.width).toBeGreaterThan(0);
      expect(MONITOR.height).toBeGreaterThan(0);
      expect(MONITOR.depth).toBeGreaterThan(0);
    });

    it('should sit above the desk surface', () => {
      expect(MONITOR.centerY).toBeGreaterThan(DESK.surfaceY);
    });

    it('should have screen inset smaller than monitor dimensions', () => {
      expect(MONITOR.screenInset).toBeLessThan(MONITOR.width / 2);
      expect(MONITOR.screenInset).toBeLessThan(MONITOR.height / 2);
    });
  });

  describe('MONITOR_CANVAS', () => {
    it('should have positive pixel dimensions', () => {
      expect(MONITOR_CANVAS.width).toBeGreaterThan(0);
      expect(MONITOR_CANVAS.height).toBeGreaterThan(0);
    });

    it('should have a dark background color', () => {
      expect(MONITOR_CANVAS.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('LAMP', () => {
    it('should have positive dimensions', () => {
      expect(LAMP.baseRadius).toBeGreaterThan(0);
      expect(LAMP.poleHeight).toBeGreaterThan(0);
      expect(LAMP.shadeHeight).toBeGreaterThan(0);
    });

    it('should be positioned at desk surface height', () => {
      expect(LAMP.positionY).toBe(DESK.surfaceY);
    });
  });

  describe('STATUS_COLORS', () => {
    it('should define colors for active, idle, waiting, error', () => {
      expect(STATUS_COLORS.active).toBeDefined();
      expect(STATUS_COLORS.idle).toBeDefined();
      expect(STATUS_COLORS.waiting).toBeDefined();
      expect(STATUS_COLORS.error).toBeDefined();
    });

    it('should be valid hex colors', () => {
      Object.values(STATUS_COLORS).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('CODE_PALETTES', () => {
    it('should define palettes for typing, reading, idle', () => {
      expect(CODE_PALETTES.typing).toBeDefined();
      expect(CODE_PALETTES.reading).toBeDefined();
      expect(CODE_PALETTES.idle).toBeDefined();
    });

    it('should have at least 2 colors per palette', () => {
      Object.values(CODE_PALETTES).forEach((palette) => {
        expect(palette.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('PARTITION', () => {
    it('should have a color and opacity', () => {
      expect(PARTITION.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(PARTITION.opacity).toBeGreaterThan(0);
      expect(PARTITION.opacity).toBeLessThanOrEqual(1);
    });
  });
});
