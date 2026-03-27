'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import type { Points as ThreePoints, PointsMaterial } from 'three';
import { MathUtils, Vector3, Color, type Scene, type Fog } from 'three';
import { useStore } from 'zustand';
import { useOfficeStore } from '@/stores/office-store';

/* ── Color constants ─────────────────────────────────────────────── */

export const DAY_BG = '#87ceeb';
export const NIGHT_BG = '#0a0e1a';
export const DAY_FOG = '#9bb8d0';
export const NIGHT_FOG = '#0a0e1a';

/* ── Atmosphere config ───────────────────────────────────────────── */

export const ATMOSPHERE_CONFIG = {
  sky: { turbidity: 2, rayleigh: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8 },
  stars: { count: 6000, radius: 400, depth: 50, factor: 4, fade: true },
  fog: {
    day: { near: 40, far: 140 },
    night: { near: 35, far: 100 },
  },
} as const;

/* ── Light intensity ranges ──────────────────────────────────────── */

const LIGHT_RANGES = {
  sun:     { min: 0.05, max: 1.2 },
  ambient: { min: 0.15, max: 0.4 },
  hemi:    { min: 0.2,  max: 0.55 },
  fill:    { min: 0.0,  max: 0.15 },
} as const;

const CEILING_BOOST = {
  ambient: 0.2,
  hemi:    0.15,
  fill:    0.15,
} as const;

/* ── Pure functions (exported for testing) ───────────────────────── */

/** Compute sun elevation and azimuth from hour of day. */
export function getSunPosition(timeOfDay: number): { elevation: number; azimuth: number } {
  const noon = 12;
  const hourAngle = ((timeOfDay - noon) / 12) * Math.PI;
  const elevation = Math.cos(hourAngle) * 70;
  const azimuth = Math.sin(hourAngle) * 180;
  return { elevation, azimuth };
}

/** Compute day factor (0=night, 1=day) from hour of day using sun elevation. */
export function getDayFactor(timeOfDay: number): number {
  const { elevation } = getSunPosition(timeOfDay);
  if (elevation >= 5) return 1;
  if (elevation <= -5) return 0;
  return MathUtils.clamp((elevation + 5) / 10, 0, 1);
}

/** Determine effective mode: 'day' | 'night' | 'twilight'. */
export function getEffectiveMode(
  timeOfDay: number,
  override: 'day' | 'night' | null,
): 'day' | 'night' | 'twilight' {
  if (override === 'day') return 'day';
  if (override === 'night') return 'night';
  const { elevation } = getSunPosition(timeOfDay);
  if (elevation > 5) return 'day';
  if (elevation < -5) return 'night';
  return 'twilight';
}

/** Lerp light intensity based on dayFactor and optional ceiling light boost. */
export function lerpLightIntensity(
  lightType: keyof typeof LIGHT_RANGES,
  dayFactor: number,
  ceilingLightsOn = false,
): number {
  const range = LIGHT_RANGES[lightType];
  const base = MathUtils.lerp(range.min, range.max, dayFactor);
  if (!ceilingLightsOn) return base;
  const boost = CEILING_BOOST[lightType as keyof typeof CEILING_BOOST] ?? 0;
  return base + boost;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function computeCurrentHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function computeSunVector(elevation: number, azimuth: number): Vector3 {
  const phi = MathUtils.degToRad(90 - elevation);
  const theta = MathUtils.degToRad(azimuth);
  return new Vector3().setFromSphericalCoords(1, phi, theta);
}

/* ── React component ─────────────────────────────────────────────── */

/** R3F component that drives sky, stars, fog, and writes dayFactor to the store. */
export default function DayNightCycle() {
  const { scene } = useThree();
  const setDayFactor = useStore(useOfficeStore, (s) => s.setDayFactor);
  const envOverride = useStore(useOfficeStore, (s) => s.envOverride);

  const sunPosRef = useRef(new Vector3(0, 1, 0));
  const dayBgColor = useRef(new Color(DAY_BG));
  const nightBgColor = useRef(new Color(NIGHT_BG));
  const dayFogColor = useRef(new Color(DAY_FOG));
  const nightFogColor = useRef(new Color(NIGHT_FOG));
  const starsRef = useRef<ThreePoints>(null);
  const prevDayFactor = useRef<number | null>(null);

  useFrame((_, delta) => {
    const hour = resolveHour(envOverride);
    const factor = getDayFactor(hour);

    // FIX-011: Only update store when value actually changes (threshold check)
    if (prevDayFactor.current === null || Math.abs(factor - prevDayFactor.current) > 0.001) {
      setDayFactor(factor);
      prevDayFactor.current = factor;
    }

    updateSunPosition(hour, sunPosRef.current);
    updateFog(scene, factor, delta, dayFogColor.current, nightFogColor.current);
    updateBackground(scene, factor, delta, dayBgColor.current, nightBgColor.current);

    // FIX-009: Lerp stars opacity with nightFactor
    if (starsRef.current) {
      const nightFactor = 1 - factor;
      const mat = starsRef.current.material as PointsMaterial;
      mat.opacity = MathUtils.lerp(mat.opacity, nightFactor, delta * 2);
      mat.transparent = true;
    }
  });

  const hour = resolveHour(envOverride);
  const sunVec = computeSunVector(...Object.values(getSunPosition(hour)) as [number, number]);
  const nightFactor = 1 - getDayFactor(hour);

  return (
    <>
      <Sky
        sunPosition={sunVec}
        turbidity={ATMOSPHERE_CONFIG.sky.turbidity}
        rayleigh={ATMOSPHERE_CONFIG.sky.rayleigh}
        mieCoefficient={ATMOSPHERE_CONFIG.sky.mieCoefficient}
        mieDirectionalG={ATMOSPHERE_CONFIG.sky.mieDirectionalG}
      />
      <Stars
        ref={starsRef}
        radius={ATMOSPHERE_CONFIG.stars.radius}
        depth={ATMOSPHERE_CONFIG.stars.depth}
        count={ATMOSPHERE_CONFIG.stars.count}
        factor={ATMOSPHERE_CONFIG.stars.factor}
        fade={ATMOSPHERE_CONFIG.stars.fade}
        saturation={0}
      />
    </>
  );
}

/* ── Frame update helpers ────────────────────────────────────────── */

function resolveHour(override: 'day' | 'night' | null): number {
  if (override === 'day') return 12;
  if (override === 'night') return 0;
  return computeCurrentHour();
}

function updateSunPosition(hour: number, target: Vector3): void {
  const { elevation, azimuth } = getSunPosition(hour);
  const next = computeSunVector(elevation, azimuth);
  target.copy(next);
}

function updateFog(
  scene: Scene,
  dayFactor: number,
  delta: number,
  dayColor: Color,
  nightColor: Color,
): void {
  if (!scene.fog) return;
  const fog = scene.fog as Fog;
  const targetColor = dayFactor > 0.5 ? dayColor : nightColor;
  fog.color.lerp(targetColor, delta * 2);
  const cfg = dayFactor > 0.5 ? ATMOSPHERE_CONFIG.fog.day : ATMOSPHERE_CONFIG.fog.night;
  fog.near = MathUtils.lerp(fog.near, cfg.near, delta);
  fog.far = MathUtils.lerp(fog.far, cfg.far, delta);
}

function updateBackground(
  scene: Scene,
  dayFactor: number,
  delta: number,
  dayColor: Color,
  nightColor: Color,
): void {
  if (scene.background && scene.background instanceof Color) {
    const target = dayFactor > 0.5 ? dayColor : nightColor;
    (scene.background as Color).lerp(target, delta * 2);
  }
}
