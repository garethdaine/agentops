'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import { useStore } from 'zustand';
import { useOfficeStore } from '@/stores/office-store';
import {
  CEILING_LIGHT_CONFIG,
  computeZoneLightIntensity,
  AMBIENT_CONFIG,
  HEMISPHERE_CONFIG,
  DIRECTIONAL_CONFIG,
  FILL_LIGHT_CONFIG,
} from '@/lib/lighting-config';
import { lerpLightIntensity, getSunPosition } from '@/slices/environment/DayNightCycle';
import { Vector3 as ThreeVector3 } from 'three';
import type { SpotLight, DirectionalLight, AmbientLight, HemisphereLight } from 'three';

/** Per-zone ceiling SpotLight that dims/brightens based on occupancy. */
function ZoneCeilingLight({ zoneId }: { zoneId: string }) {
  const config = CEILING_LIGHT_CONFIG[zoneId];
  const lightRef = useRef<SpotLight>(null);
  const currentIntensity = useRef(0.3);

  const occupantCount = useStore(useOfficeStore, (s) => {
    const agents = s.zoneOccupancy.get(zoneId);
    return agents ? agents.length : 0;
  });

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    const target = computeZoneLightIntensity(occupantCount);
    const speed = 2.0; // ~500ms transition
    currentIntensity.current += (target - currentIntensity.current) * Math.min(speed * delta, 1);
    lightRef.current.intensity = currentIntensity.current;
  });

  return (
    <spotLight
      ref={lightRef}
      position={[config.position.x, config.position.y, config.position.z]}
      target-position={[config.target.x, config.target.y, config.target.z]}
      angle={config.angle}
      penumbra={config.penumbra}
      intensity={0.3}
      castShadow={false}
    />
  );
}

/**
 * Office lighting rig: ambient, hemisphere, directional (shadow caster),
 * fill directional, and per-zone ceiling SpotLights with occupancy detection.
 * Light intensities are driven by dayFactor from the environment slice.
 */
export default function OfficeLighting() {
  const zoneIds = Object.keys(CEILING_LIGHT_CONFIG);
  const dayFactor = useStore(useOfficeStore, (s) => s.dayFactor);

  const sunRef = useRef<DirectionalLight>(null);
  const ambientRef = useRef<AmbientLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const fillRef = useRef<DirectionalLight>(null);

  const weather = useStore(useOfficeStore, (s) => s.weather);
  const envOverride = useStore(useOfficeStore, (s) => s.envOverride);
  const ceilingLightsOn = dayFactor < 0.5;

  useFrame((_, delta) => {
    applyDynamicIntensity(sunRef.current, 'sun', dayFactor, delta);
    applyDynamicIntensity(ambientRef.current, 'ambient', dayFactor, delta, ceilingLightsOn);
    applyDynamicIntensity(hemiRef.current, 'hemi', dayFactor, delta, ceilingLightsOn);
    applyDynamicIntensity(fillRef.current, 'fill', dayFactor, delta, ceilingLightsOn);

    // Sync directional light position to sun position
    if (sunRef.current) {
      const hour = envOverride === 'day' ? 12 : envOverride === 'night' ? 0 : new Date().getHours() + new Date().getMinutes() / 60;
      const { elevation, azimuth } = getSunPosition(hour);
      const phi = MathUtils.degToRad(90 - elevation);
      const theta = MathUtils.degToRad(azimuth);
      const sunVec = new ThreeVector3().setFromSphericalCoords(50, phi, theta);
      sunRef.current.position.copy(sunVec);
    }

    // Thunderstorm flash: 0.3% chance per frame to spike directional light intensity
    if (weather === 'thunderstorm' && sunRef.current && Math.random() < 0.003) {
      sunRef.current.intensity = 3.0;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={AMBIENT_CONFIG.intensity} />

      <hemisphereLight
        ref={hemiRef}
        args={[HEMISPHERE_CONFIG.skyColor, HEMISPHERE_CONFIG.groundColor, HEMISPHERE_CONFIG.intensity]}
      />

      {/* Main directional sunlight -- sole shadow caster (REQ-126) */}
      <directionalLight
        ref={sunRef}
        position={[...DIRECTIONAL_CONFIG.position]}
        intensity={DIRECTIONAL_CONFIG.intensity}
        castShadow
        shadow-mapSize-width={DIRECTIONAL_CONFIG.shadowMapSize}
        shadow-mapSize-height={DIRECTIONAL_CONFIG.shadowMapSize}
        shadow-camera-left={-DIRECTIONAL_CONFIG.shadowCameraExtent}
        shadow-camera-right={DIRECTIONAL_CONFIG.shadowCameraExtent}
        shadow-camera-top={DIRECTIONAL_CONFIG.shadowCameraExtent}
        shadow-camera-bottom={-DIRECTIONAL_CONFIG.shadowCameraExtent}
        shadow-camera-near={DIRECTIONAL_CONFIG.shadowNear}
        shadow-camera-far={DIRECTIONAL_CONFIG.shadowFar}
        shadow-bias={DIRECTIONAL_CONFIG.shadowBias}
      />

      {/* Fill light -- no shadows */}
      <directionalLight
        ref={fillRef}
        position={[...FILL_LIGHT_CONFIG.position]}
        intensity={FILL_LIGHT_CONFIG.intensity}
        color={FILL_LIGHT_CONFIG.color}
      />

      {/* Per-zone ceiling SpotLights */}
      {zoneIds.map((id) => (
        <ZoneCeilingLight key={id} zoneId={id} />
      ))}
    </>
  );
}

/** Smoothly lerp a light's intensity toward the target for the current dayFactor. */
function applyDynamicIntensity(
  light: { intensity: number } | null,
  lightType: 'sun' | 'ambient' | 'hemi' | 'fill',
  dayFactor: number,
  delta: number,
  ceilingLightsOn = false,
): void {
  if (!light) return;
  const target = lerpLightIntensity(lightType, dayFactor, ceilingLightsOn);
  light.intensity = MathUtils.lerp(light.intensity, target, delta * 2);
}
