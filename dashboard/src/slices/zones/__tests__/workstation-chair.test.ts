import { describe, it, expect } from 'vitest';
import { CHAIR } from '@/lib/furniture-geometry';
import { DESK } from '@/lib/furniture-geometry';

describe('chair geometry constants', () => {
  it('should define CHAIR constant with all required dimensions', () => {
    expect(CHAIR).toBeDefined();
    expect(CHAIR.seatWidth).toBeGreaterThan(0);
    expect(CHAIR.seatDepth).toBeGreaterThan(0);
    expect(CHAIR.seatHeight).toBeGreaterThan(0);
    expect(CHAIR.backHeight).toBeGreaterThan(0);
    expect(CHAIR.backThickness).toBeGreaterThan(0);
    expect(CHAIR.baseRadius).toBeGreaterThan(0);
    expect(CHAIR.cylinderRadius).toBeGreaterThan(0);
    expect(CHAIR.cylinderHeight).toBeGreaterThan(0);
    expect(CHAIR.armHeight).toBeGreaterThan(0);
    expect(CHAIR.armWidth).toBeGreaterThan(0);
  });

  it('should have seat height below desk surface', () => {
    expect(CHAIR.seatHeight + CHAIR.seatThickness).toBeLessThan(DESK.surfaceY);
  });

  it('should have chair colors defined', () => {
    expect(CHAIR.seatColor).toBeDefined();
    expect(CHAIR.baseColor).toBeDefined();
    expect(CHAIR.armColor).toBeDefined();
  });

  it('should position chair behind desk (positive Z offset when rotation=0)', () => {
    expect(CHAIR.offsetZ).toBeGreaterThan(DESK.depth / 2);
  });
});
