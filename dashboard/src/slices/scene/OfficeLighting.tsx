'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
import type { SpotLight } from 'three';

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
 */
export default function OfficeLighting() {
  const zoneIds = Object.keys(CEILING_LIGHT_CONFIG);

  return (
    <>
      <ambientLight intensity={AMBIENT_CONFIG.intensity} />

      <hemisphereLight
        args={[HEMISPHERE_CONFIG.skyColor, HEMISPHERE_CONFIG.groundColor, HEMISPHERE_CONFIG.intensity]}
      />

      {/* Main directional sunlight -- sole shadow caster (REQ-126) */}
      <directionalLight
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
