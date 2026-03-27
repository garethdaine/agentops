'use client';

import { SERVER_RACK } from '@/lib/furniture-geometry';
import { usePulsingEmissive } from '../hooks/usePulsingEmissive';
import type { LedState } from '../zone-feedback';

interface ServerRackProps {
  position: [number, number, number];
  rotation?: number;
  /** Dynamic LED state derived from agent health. */
  ledState?: LedState;
}

/** Server rack with LED indicators per shelf. */
export default function ServerRack({ position, rotation = 0, ledState }: ServerRackProps) {
  const { width, height, depth, shelfCount, shelfSpacing, shelfStartY } = SERVER_RACK;

  const ledColor = ledState?.color ?? SERVER_RACK.ledColor;
  const ledMode = ledState?.mode ?? 'static';
  const ledIntensity = ledState?.intensity ?? 0.8;

  const matRef = usePulsingEmissive({
    color: ledColor,
    mode: ledMode,
    intensity: ledIntensity,
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={SERVER_RACK.color} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2 + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.08, height - 0.1, 0.02]} />
        <meshStandardMaterial color={SERVER_RACK.panelColor} />
      </mesh>

      {/* Shelves and LEDs */}
      {Array.from({ length: shelfCount }).map((_, i) => {
        const y = shelfStartY + i * shelfSpacing;
        return (
          <group key={i}>
            <mesh position={[0, y, 0]} castShadow receiveShadow>
              <boxGeometry args={[width - 0.12, 0.02, depth - 0.1]} />
              <meshStandardMaterial color={SERVER_RACK.shelfColor} />
            </mesh>
            {/* Status LED */}
            <mesh position={[-0.2, y + 0.06, -depth / 2 + 0.01]}>
              <sphereGeometry args={[SERVER_RACK.ledRadius, 12, 8]} />
              <meshStandardMaterial
                ref={i === 0 ? matRef : undefined}
                color={ledColor}
                emissive={ledColor}
                emissiveIntensity={ledIntensity}
              />
            </mesh>
            {/* Activity LED */}
            <mesh position={[-0.14, y + 0.06, -depth / 2 + 0.01]}>
              <sphereGeometry args={[SERVER_RACK.activityLedRadius, 12, 8]} />
              <meshStandardMaterial
                color={SERVER_RACK.activityLedColor}
                emissive={SERVER_RACK.activityLedColor}
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
