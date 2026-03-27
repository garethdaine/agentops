'use client';

import type { Object3D } from 'three';

/** Bloom effect configuration (REQ-097) */
export const BLOOM_CONFIG = {
  luminanceThreshold: 1,
  luminanceSmoothing: 0.9,
  intensity: 0.8,
  radius: 0.4,
  selective: true,
} as const;

/** Outline effect configuration (REQ-098) */
export const OUTLINE_CONFIG = {
  edgeStrength: 3,
  visibleEdgeColor: '#60a5fa',
  hiddenEdgeColor: '#1e3a5f',
  pulseSpeed: 0.6,
  blur: false,
  xRay: true,
} as const;

/** Tone mapping configuration (REQ-099) */
export const TONE_MAPPING_CONFIG = {
  toneMapping: 'ACESFilmic' as const,
  exposure: 1.4,
} as const;

/** Performance thresholds with hysteresis (REQ-100) */
export const PERFORMANCE_THRESHOLDS = {
  minFps: 30,
  recoveryFps: 45,
} as const;

/**
 * Determine whether post-processing effects should be disabled.
 * Uses hysteresis to avoid flickering: disable below minFps,
 * only re-enable once recoveryFps is exceeded.
 */
export function shouldDisableEffects(
  currentFps: number,
  currentlyDisabled: boolean,
): boolean {
  if (currentlyDisabled) {
    return currentFps < PERFORMANCE_THRESHOLDS.recoveryFps;
  }
  return currentFps < PERFORMANCE_THRESHOLDS.minFps;
}

/** Return bloom props, zeroing intensity when effects are disabled. */
export function getBloomProps(disabled: boolean) {
  return {
    luminanceThreshold: BLOOM_CONFIG.luminanceThreshold,
    luminanceSmoothing: BLOOM_CONFIG.luminanceSmoothing,
    intensity: disabled ? 0 : BLOOM_CONFIG.intensity,
    radius: BLOOM_CONFIG.radius,
  };
}

/** Return outline props with selection array and edge strength. */
export function getOutlineProps(
  selection: Object3D[],
  disabled: boolean,
) {
  return {
    selection,
    edgeStrength: disabled ? 0 : OUTLINE_CONFIG.edgeStrength,
    visibleEdgeColor: OUTLINE_CONFIG.visibleEdgeColor,
    hiddenEdgeColor: OUTLINE_CONFIG.hiddenEdgeColor,
    pulseSpeed: OUTLINE_CONFIG.pulseSpeed,
    blur: OUTLINE_CONFIG.blur,
    xRay: OUTLINE_CONFIG.xRay,
  };
}

/**
 * PostProcessing component placeholder.
 * Full EffectComposer integration will be wired when
 * Canvas/scene children are composed (REQ-097, REQ-098, REQ-100).
 */
export default function PostProcessing() {
  return null;
}
