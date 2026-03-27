'use client';

import { WHITEBOARD } from '@/lib/furniture-geometry';
import type { WhiteboardGlow } from '../zone-feedback';

interface WhiteboardProps {
  position: [number, number, number];
  rotation?: number;
  /** Glow state derived from delegation activity. */
  glow?: WhiteboardGlow;
}

/** Whiteboard with frame, surface, and marker tray. */
export default function Whiteboard({ position, rotation = 0, glow }: WhiteboardProps) {
  const { width, height, frameDepth, surfaceDepth, surfaceColor } = WHITEBOARD;
  const emissiveIntensity = glow?.emissiveIntensity ?? 0;
  const emissiveColor = glow?.emissiveColor ?? '#4488ff';

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, frameDepth]} />
        <meshStandardMaterial color={WHITEBOARD.color} />
      </mesh>

      {/* White surface */}
      <mesh position={[0, 0, -frameDepth / 2 + 0.005]}>
        <boxGeometry args={[width, height, surfaceDepth]} />
        <meshStandardMaterial
          color={surfaceColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Marker tray */}
      <mesh position={[0, -height / 2 - 0.02, -frameDepth / 2 - 0.02]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.1, WHITEBOARD.trayHeight, WHITEBOARD.trayDepth]} />
        <meshStandardMaterial color={WHITEBOARD.trayColor} />
      </mesh>
    </group>
  );
}
