'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from 'zustand';
import {
  MathUtils,
  LineSegments as ThreeLineSegments,
  Points as ThreePoints,
  BufferAttribute,
  type LineBasicMaterial,
  type PointsMaterial,
} from 'three';
import { useOfficeStore } from '@/stores/office-store';
import { isInsideOffice, randomOutdoorPosition } from '@/lib/weather-service';

/* ── Constants ──────────────────────────────────────────────────── */

export const RAIN_DROP_COUNT = 2000;
export const SNOW_PARTICLE_COUNT = 2000;

const RAIN_COLOR = '#8ab4f8';
const SNOW_COLOR = '#ffffff';
const SPREAD_HEIGHT = 20;
const RESET_HEIGHT_MIN = 16;
const RESET_HEIGHT_RANGE = 6;
const SNOW_RESET_MIN = 15;
const SNOW_RESET_RANGE = 5;

/* ── Pure geometry creators (exported for testing) ──────────────── */

/** Create initial rain drop positions as a flat Float32Array (2 verts per drop). */
export function createRainDropPositions(): Float32Array {
  const positions = new Float32Array(RAIN_DROP_COUNT * 2 * 3);
  for (let i = 0; i < RAIN_DROP_COUNT; i++) {
    const { x, z } = randomOutdoorPosition();
    const y = Math.random() * SPREAD_HEIGHT;
    const len = 0.25 + Math.random() * 0.55;
    const top = i * 6;
    positions[top] = x;
    positions[top + 1] = y;
    positions[top + 2] = z;
    positions[top + 3] = x;
    positions[top + 4] = y - len;
    positions[top + 5] = z;
  }
  return positions;
}

/** Create initial rain drop lengths array. */
export function createRainDropLengths(): Float32Array {
  const lengths = new Float32Array(RAIN_DROP_COUNT);
  for (let i = 0; i < RAIN_DROP_COUNT; i++) {
    lengths[i] = 0.25 + Math.random() * 0.55;
  }
  return lengths;
}

/** Create initial snow particle positions as a flat Float32Array. */
export function createSnowPositions(): Float32Array {
  const positions = new Float32Array(SNOW_PARTICLE_COUNT * 3);
  for (let i = 0; i < SNOW_PARTICLE_COUNT * 3; i += 3) {
    const { x, z } = randomOutdoorPosition();
    positions[i] = x;
    positions[i + 1] = Math.random() * SPREAD_HEIGHT;
    positions[i + 2] = z;
  }
  return positions;
}

/* ── Pure update functions (exported for testing) ───────────────── */

/** Update rain drop positions: move downward with wind drift, reset when below ground. */
export function updateRainPositions(
  positions: Float32Array,
  lengths: Float32Array,
  delta: number,
  speed: number,
  windSpeed: number,
): void {
  const windDrift = windSpeed * 0.02 * delta;
  const fall = speed * delta;

  for (let i = 0; i < RAIN_DROP_COUNT; i++) {
    const topIdx = i * 6;
    const botIdx = topIdx + 3;
    let topY = positions[topIdx + 1] - fall;
    const len = lengths[i];

    if (topY - len < 0 || isInsideOffice(positions[topIdx], positions[topIdx + 2])) {
      topY = RESET_HEIGHT_MIN + Math.random() * RESET_HEIGHT_RANGE;
      const newLen = 0.25 + Math.random() * 0.55;
      lengths[i] = newLen;
      const { x, z } = randomOutdoorPosition();
      positions[topIdx] = x;
      positions[topIdx + 1] = topY;
      positions[topIdx + 2] = z;
      positions[botIdx] = x;
      positions[botIdx + 1] = topY - newLen;
      positions[botIdx + 2] = z;
    } else {
      const topX = positions[topIdx] + windDrift;
      positions[topIdx] = topX;
      positions[topIdx + 1] = topY;
      positions[botIdx] = topX;
      positions[botIdx + 1] = topY - len;
    }
  }
}

/** Update snow particle positions: drift downward with sinusoidal horizontal movement. */
export function updateSnowPositions(
  positions: Float32Array,
  delta: number,
): void {
  const now = Date.now() * 0.001;

  for (let i = 0; i < SNOW_PARTICLE_COUNT; i++) {
    const idx = i * 3;
    let y = positions[idx + 1] - 2 * delta;
    const drift = Math.sin(now + i) * 0.3 * delta;
    const nx = positions[idx] + drift;

    if (y < 0 || isInsideOffice(nx, positions[idx + 2])) {
      y = SNOW_RESET_MIN + Math.random() * SNOW_RESET_RANGE;
      const { x, z } = randomOutdoorPosition();
      positions[idx] = x;
      positions[idx + 2] = z;
    } else {
      positions[idx] = nx;
    }
    positions[idx + 1] = y;
  }
}

/* ── R3F Component ──────────────────────────────────────────────── */

/** Weather particle system rendering rain and snow outside the office. */
export default function WeatherParticles() {
  const weather = useStore(useOfficeStore, (s) => s.weather);

  const rainOpacity = useRef(0);
  const snowOpacity = useRef(0);
  const rainRef = useRef<ThreeLineSegments>(null);
  const snowRef = useRef<ThreePoints>(null);

  const rainPositions = useMemo(createRainDropPositions, []);
  const rainLengths = useMemo(createRainDropLengths, []);
  const snowPositions = useMemo(createSnowPositions, []);

  useFrame((_, delta) => {
    const isRain = weather === 'rain' || weather === 'showers' || weather === 'thunderstorm';
    const isSnow = weather === 'snow';

    /* ── Rain ── */
    const rainTarget = isRain ? 0.5 : 0;
    rainOpacity.current = MathUtils.lerp(rainOpacity.current, rainTarget, delta * 3);

    if (rainRef.current) {
      const mat = rainRef.current.material as LineBasicMaterial;
      mat.opacity = rainOpacity.current;

      if (rainOpacity.current > 0.01) {
        const speed = weather === 'thunderstorm' ? 28 : 18;
        updateRainPositions(rainPositions, rainLengths, delta, speed, 5);
        rainRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }

    /* ── Snow ── */
    const snowTarget = isSnow ? 0.7 : 0;
    snowOpacity.current = MathUtils.lerp(snowOpacity.current, snowTarget, delta * 3);

    if (snowRef.current) {
      const mat = snowRef.current.material as PointsMaterial;
      mat.opacity = snowOpacity.current;

      if (snowOpacity.current > 0.01) {
        updateSnowPositions(snowPositions, delta);
        snowRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <lineSegments ref={rainRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[rainPositions, 3]}
            count={RAIN_DROP_COUNT * 2}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={RAIN_COLOR}
          transparent
          opacity={0}
          linewidth={1}
        />
      </lineSegments>

      <points ref={snowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[snowPositions, 3]}
            count={SNOW_PARTICLE_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          color={SNOW_COLOR}
          size={0.3}
          transparent
          opacity={0}
          sizeAttenuation
        />
      </points>
    </>
  );
}
