import { describe, it, expect } from 'vitest';
import {
  RAIN_DROP_COUNT,
  SNOW_PARTICLE_COUNT,
  createRainDropPositions,
  createSnowPositions,
  updateRainPositions,
  updateSnowPositions,
} from './WeatherParticles';

describe('weather particle constants', () => {
  it('should define 2000 rain drops', () => {
    expect(RAIN_DROP_COUNT).toBe(2000);
  });

  it('should define 2000 snow particles', () => {
    expect(SNOW_PARTICLE_COUNT).toBe(2000);
  });
});

describe('createRainDropPositions', () => {
  it('should return Float32Array of correct size for LineSegments (2 verts per drop)', () => {
    const positions = createRainDropPositions();
    expect(positions).toBeInstanceOf(Float32Array);
    expect(positions.length).toBe(RAIN_DROP_COUNT * 2 * 3); // 2 endpoints * 3 coords
  });

  it('should place all drops outside office bounds', () => {
    const positions = createRainDropPositions();
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      const topIdx = i * 6;
      const x = positions[topIdx];
      const z = positions[topIdx + 2];
      // At least one coordinate should exceed office bounds
      const inside = Math.abs(x) < 14 && Math.abs(z) < 11;
      expect(inside).toBe(false);
    }
  });
});

describe('createSnowPositions', () => {
  it('should return Float32Array of correct size', () => {
    const positions = createSnowPositions();
    expect(positions).toBeInstanceOf(Float32Array);
    expect(positions.length).toBe(SNOW_PARTICLE_COUNT * 3);
  });
});

describe('updateRainPositions', () => {
  it('should move drops downward', () => {
    const positions = createRainDropPositions();
    const initialY = positions[1]; // y of first drop top vertex
    const lengths = new Float32Array(RAIN_DROP_COUNT).fill(0.3);
    updateRainPositions(positions, lengths, 0.016, 18, 5);
    expect(positions[1]).toBeLessThan(initialY);
  });
});

describe('updateSnowPositions', () => {
  it('should move flakes downward with drift', () => {
    const positions = createSnowPositions();
    const initialY = positions[1];
    updateSnowPositions(positions, 0.016);
    expect(positions[1]).toBeLessThan(initialY);
  });
});
