'use client';

import { SCREEN_WALL } from '@/lib/furniture-geometry';

interface WarRoomScreenProps {
  position: [number, number, number];
  rotation?: number;
}

/** Multi-screen wall display for the war room. */
export default function WarRoomScreen({ position, rotation = 0 }: WarRoomScreenProps) {
  const { width, height, depth, screenCount, screenHeight, screenMargin } = SCREEN_WALL;
  const screenWidth = (width - screenMargin * 2) / screenCount;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Wall backing */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={SCREEN_WALL.color} />
      </mesh>

      {/* Individual screens */}
      {Array.from({ length: screenCount }).map((_, i) => {
        const sx = -width / 2 + screenMargin + screenWidth * i + screenWidth / 2;
        return (
          <group key={i}>
            {/* Screen casing */}
            <mesh position={[sx, height * 0.6, -depth / 2 - 0.01]} castShadow>
              <boxGeometry args={[screenWidth - 0.1, screenHeight, 0.01]} />
              <meshStandardMaterial color={SCREEN_WALL.screenCasingColor} />
            </mesh>
            {/* Screen surface */}
            <mesh position={[sx, height * 0.6, -depth / 2 - 0.02]}>
              <boxGeometry args={[screenWidth - 0.2, screenHeight - 0.1, 0.005]} />
              <meshStandardMaterial
                color={SCREEN_WALL.screenColor}
                emissive={SCREEN_WALL.screenEmissive}
                emissiveIntensity={0.2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
