import { describe, it, expect } from 'vitest';
import {
  BLOOM_CONFIG,
  OUTLINE_CONFIG,
  TONE_MAPPING_CONFIG,
  PERFORMANCE_THRESHOLDS,
  shouldDisableEffects,
  getBloomProps,
  getOutlineProps,
} from './PostProcessing';

describe('BLOOM_CONFIG', () => {
  it('should set luminanceThreshold to 1', () => {
    expect(BLOOM_CONFIG.luminanceThreshold).toBe(1);
  });

  it('should use selective bloom', () => {
    expect(BLOOM_CONFIG.selective).toBe(true);
  });

  it('should define intensity and radius', () => {
    expect(BLOOM_CONFIG.intensity).toBeGreaterThan(0);
    expect(BLOOM_CONFIG.radius).toBeGreaterThan(0);
  });
});

describe('OUTLINE_CONFIG', () => {
  it('should define edge strength', () => {
    expect(OUTLINE_CONFIG.edgeStrength).toBeGreaterThan(0);
  });

  it('should define visible edge color', () => {
    expect(OUTLINE_CONFIG.visibleEdgeColor).toBeTruthy();
  });

  it('should define pulse speed', () => {
    expect(OUTLINE_CONFIG.pulseSpeed).toBeGreaterThanOrEqual(0);
  });
});

describe('TONE_MAPPING_CONFIG', () => {
  it('should use ACES Filmic tone mapping', () => {
    expect(TONE_MAPPING_CONFIG.toneMapping).toBe('ACESFilmic');
  });

  it('should set exposure to 1.4', () => {
    expect(TONE_MAPPING_CONFIG.exposure).toBeCloseTo(1.4);
  });
});

describe('PERFORMANCE_THRESHOLDS', () => {
  it('should disable effects below 30 FPS', () => {
    expect(PERFORMANCE_THRESHOLDS.minFps).toBe(30);
  });

  it('should re-enable effects above a recovery threshold', () => {
    expect(PERFORMANCE_THRESHOLDS.recoveryFps).toBeGreaterThan(PERFORMANCE_THRESHOLDS.minFps);
  });
});

describe('shouldDisableEffects', () => {
  it('should return true when current FPS is below minFps', () => {
    expect(shouldDisableEffects(25, false)).toBe(true);
  });

  it('should return false when FPS is above minFps and effects are enabled', () => {
    expect(shouldDisableEffects(60, false)).toBe(false);
  });

  it('should keep effects disabled until recovery threshold is reached', () => {
    // Effects currently disabled (true), FPS at 35 (above min but below recovery)
    expect(shouldDisableEffects(35, true)).toBe(true);
  });

  it('should re-enable effects when FPS exceeds recovery threshold', () => {
    expect(shouldDisableEffects(50, true)).toBe(false);
  });
});

describe('getBloomProps', () => {
  it('should return bloom config when effects are enabled', () => {
    const props = getBloomProps(false);
    expect(props.luminanceThreshold).toBe(BLOOM_CONFIG.luminanceThreshold);
    expect(props.intensity).toBeGreaterThan(0);
  });

  it('should return zero intensity when effects are disabled', () => {
    const props = getBloomProps(true);
    expect(props.intensity).toBe(0);
  });
});

describe('getOutlineProps', () => {
  it('should return outline config with selection when agent is selected', () => {
    const mockMesh = { type: 'Mesh' };
    const props = getOutlineProps([mockMesh as any], false);
    expect(props.selection).toHaveLength(1);
    expect(props.edgeStrength).toBe(OUTLINE_CONFIG.edgeStrength);
  });

  it('should return empty selection when no agent selected', () => {
    const props = getOutlineProps([], false);
    expect(props.selection).toHaveLength(0);
  });

  it('should return zero edge strength when effects are disabled', () => {
    const mockMesh = { type: 'Mesh' };
    const props = getOutlineProps([mockMesh as any], true);
    expect(props.edgeStrength).toBe(0);
  });
});
