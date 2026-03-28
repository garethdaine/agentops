import { describe, it, expect } from 'vitest';
import {
  getDayFactor,
  getSunPosition,
  getEffectiveMode,
  lerpLightIntensity,
  DAY_BG,
  NIGHT_BG,
  DAY_FOG,
  NIGHT_FOG,
} from './DayNightCycle';

describe('getDayFactor', () => {
  it('should return 1 at noon (12:00)', () => {
    expect(getDayFactor(12)).toBe(1);
  });

  it('should return 0 at midnight (0:00)', () => {
    expect(getDayFactor(0)).toBe(0);
  });

  it('should return a value between 0 and 1 at twilight (6:00)', () => {
    const factor = getDayFactor(6);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });

  it('should return a value between 0 and 1 at dusk (18:00)', () => {
    const factor = getDayFactor(18);
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
  });

  it('should be symmetric around noon', () => {
    const morning = getDayFactor(9); // 3h before noon
    const afternoon = getDayFactor(15); // 3h after noon
    expect(morning).toBeCloseTo(afternoon, 2);
  });

  it('should clamp to 0-1 range', () => {
    for (let h = 0; h < 24; h += 0.5) {
      const f = getDayFactor(h);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('getSunPosition', () => {
  it('should return high elevation at noon', () => {
    const { elevation } = getSunPosition(12);
    expect(elevation).toBeGreaterThan(50);
  });

  it('should return negative elevation at midnight', () => {
    const { elevation } = getSunPosition(0);
    expect(elevation).toBeLessThan(0);
  });

  it('should return an azimuth value', () => {
    const { azimuth } = getSunPosition(12);
    expect(typeof azimuth).toBe('number');
  });
});

describe('getEffectiveMode', () => {
  it('should return "day" when override is "day"', () => {
    expect(getEffectiveMode(12, 'day')).toBe('day');
    expect(getEffectiveMode(0, 'day')).toBe('day'); // override ignores clock
  });

  it('should return "night" when override is "night"', () => {
    expect(getEffectiveMode(12, 'night')).toBe('night');
  });

  it('should return "day" at noon with no override', () => {
    expect(getEffectiveMode(12, null)).toBe('day');
  });

  it('should return "night" at midnight with no override', () => {
    expect(getEffectiveMode(0, null)).toBe('night');
  });

  it('should return "twilight" near dawn/dusk', () => {
    const mode = getEffectiveMode(6, null);
    expect(['day', 'twilight']).toContain(mode);
  });
});

describe('lerpLightIntensity', () => {
  it('should return target intensity at dayFactor=1 for sun', () => {
    const result = lerpLightIntensity('sun', 1);
    expect(result).toBeCloseTo(1.2, 1);
  });

  it('should return reduced intensity at dayFactor=0 for sun', () => {
    const result = lerpLightIntensity('sun', 0);
    expect(result).toBeLessThan(0.2);
  });

  it('should return ambient intensity boosted when ceiling lights enabled', () => {
    const withCeiling = lerpLightIntensity('ambient', 0.3, true);
    const withoutCeiling = lerpLightIntensity('ambient', 0.3, false);
    expect(withCeiling).toBeGreaterThan(withoutCeiling);
  });
});

describe('color constants', () => {
  it('should define day background as sky blue', () => {
    expect(DAY_BG).toBe('#87ceeb');
  });

  it('should define night background as dark blue', () => {
    expect(NIGHT_BG).toBe('#0a0e1a');
  });

  it('should define day fog color', () => {
    expect(DAY_FOG).toBe('#9bb8d0');
  });

  it('should define night fog color', () => {
    expect(NIGHT_FOG).toBe('#0a0e1a');
  });
});
