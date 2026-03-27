'use client';

import { SERVER_RACK } from '@/lib/furniture-geometry';

interface ServerRackProps {
  position: [number, number, number];
  rotation?: number;
}

/** Server rack with LED indicators per shelf. */
export default function ServerRack({ position, rotation = 0 }: ServerRackProps) {
  const { width, height, depth, shelfCount, shelfSpacing, shelfStartY } = SERVER_RACK;

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
                color={SERVER_RACK.ledColor}
                emissive={SERVER_RACK.ledColor}
                emissiveIntensity={0.8}
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
