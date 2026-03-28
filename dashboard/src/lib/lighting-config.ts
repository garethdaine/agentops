import { ZONES } from '@/lib/floorplan';

/** Per-zone ceiling SpotLight configuration. */
export interface CeilingLightEntry {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  angle: number;
  penumbra: number;
}

const CEILING_HEIGHT = 3.0;
const SPOT_ANGLE = Math.PI / 4;
const SPOT_PENUMBRA = 0.5;

/** Ceiling light configs keyed by zone ID, derived from zone center positions. */
export const CEILING_LIGHT_CONFIG: Record<string, CeilingLightEntry> = Object.fromEntries(
  ZONES.map((zone) => [
    zone.id,
    {
      position: { x: zone.position.x, y: CEILING_HEIGHT, z: zone.position.z },
      target: { x: zone.position.x, y: 0, z: zone.position.z },
      angle: SPOT_ANGLE,
      penumbra: SPOT_PENUMBRA,
    },
  ]),
);

const MIN_INTENSITY = 0.3;
const MAX_INTENSITY = 1.0;
const INTENSITY_STEP = 0.2;

/** Compute zone light intensity based on occupant count. Smooth linear lerp clamped to [0.3, 1.0]. */
export function computeZoneLightIntensity(occupantCount: number): number {
  return Math.min(MIN_INTENSITY + occupantCount * INTENSITY_STEP, MAX_INTENSITY);
}

/** Shadow configuration enforcing REQ-126: only 1 directional shadow caster. */
export const SHADOW_CONFIG = {
  maxShadowCasters: 1,
  type: 'directional' as const,
} as const;

/** Fog configuration for the expanded floor size. */
export const FOG_CONFIG = {
  near: 35,
  far: 60,
} as const;

/** Ambient/hemisphere/directional base lighting values. */
export const AMBIENT_CONFIG = {
  intensity: 0.35,
} as const;

export const HEMISPHERE_CONFIG = {
  skyColor: '#445577',
  groundColor: '#111122',
  intensity: 0.5,
} as const;

export const DIRECTIONAL_CONFIG = {
  position: [10, 15, 8] as const,
  intensity: 0.8,
  shadowMapSize: 1024,
  shadowCameraExtent: 15,
  shadowNear: 0.5,
  shadowFar: 40,
  shadowBias: -0.001,
} as const;

export const FILL_LIGHT_CONFIG = {
  position: [-8, 8, -6] as const,
  intensity: 0.4,
  color: '#6699cc',
} as const;
