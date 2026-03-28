import { describe, it, expect } from 'vitest';
import {
  CEILING_LIGHT_CONFIG,
  computeZoneLightIntensity,
  SHADOW_CONFIG,
  FOG_CONFIG,
} from '@/lib/lighting-config';
import { ZONES } from '@/lib/floorplan';

describe('ceiling light configuration', () => {
  it('should define a ceiling light config for each of the 10 zones', () => {
    expect(Object.keys(CEILING_LIGHT_CONFIG)).toHaveLength(10);
    ZONES.forEach((zone) => {
      expect(CEILING_LIGHT_CONFIG[zone.id]).toBeDefined();
    });
  });

  it('should position lights above zone centers at ceiling height', () => {
    Object.values(CEILING_LIGHT_CONFIG).forEach((config) => {
      expect(config.position.y).toBeGreaterThanOrEqual(2.8);
      expect(config.position.y).toBeLessThanOrEqual(3.5);
    });
  });

  it('should define angle and penumbra for SpotLight', () => {
    Object.values(CEILING_LIGHT_CONFIG).forEach((config) => {
      expect(config.angle).toBeGreaterThan(0);
      expect(config.angle).toBeLessThanOrEqual(Math.PI / 3);
      expect(config.penumbra).toBeGreaterThanOrEqual(0);
      expect(config.penumbra).toBeLessThanOrEqual(1);
    });
  });

  it('should target the floor (y=0) at zone center', () => {
    ZONES.forEach((zone) => {
      const config = CEILING_LIGHT_CONFIG[zone.id];
      expect(config.target.x).toBeCloseTo(zone.position.x, 0);
      expect(config.target.z).toBeCloseTo(zone.position.z, 0);
      expect(config.target.y).toBe(0);
    });
  });
});

describe('computeZoneLightIntensity', () => {
  it('should return dim intensity when zone is empty (0 occupants)', () => {
    const intensity = computeZoneLightIntensity(0);
    expect(intensity).toBeCloseTo(0.3, 1);
  });

  it('should return brighter intensity when zone is occupied (1+ occupants)', () => {
    const intensity1 = computeZoneLightIntensity(1);
    const intensity3 = computeZoneLightIntensity(3);
    expect(intensity1).toBeGreaterThan(0.3);
    expect(intensity3).toBeGreaterThan(intensity1);
  });

  it('should clamp intensity at maximum (1.0)', () => {
    const intensity = computeZoneLightIntensity(20);
    expect(intensity).toBeLessThanOrEqual(1.0);
  });

  it('should use a smooth lerp (not step function)', () => {
    const i0 = computeZoneLightIntensity(0);
    const i1 = computeZoneLightIntensity(1);
    const i2 = computeZoneLightIntensity(2);
    expect(i1).toBeGreaterThan(i0);
    expect(i2).toBeGreaterThan(i1);
  });
});

describe('shadow configuration', () => {
  it('should define only 1 shadow-casting directional light', () => {
    expect(SHADOW_CONFIG.maxShadowCasters).toBe(1);
    expect(SHADOW_CONFIG.type).toBe('directional');
  });
});

describe('fog configuration', () => {
  it('should update fog to near=35, far=60', () => {
    expect(FOG_CONFIG.near).toBe(35);
    expect(FOG_CONFIG.far).toBe(60);
  });
});
