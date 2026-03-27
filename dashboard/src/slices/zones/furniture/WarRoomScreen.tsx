'use client';

import { useRef, useMemo } from 'react';
import { CanvasTexture } from 'three';
import { SCREEN_WALL } from '@/lib/furniture-geometry';

interface WarRoomScreenProps {
  position: [number, number, number];
  rotation?: number;
  /** Number of active waves to display on the first screen. */
  activeWaveCount?: number;
  /** Total tasks in progress across all waves. */
  activeTasks?: number;
}

/** Draw wave data onto a canvas texture for the first screen. */
function createWaveTexture(waveCount: number, taskCount: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#001122';
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = '#e0e8ff';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${waveCount} WAVES`, 128, 50);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`${taskCount} active tasks`, 128, 85);

  return new CanvasTexture(canvas);
}

/** Multi-screen wall display for the war room. */
export default function WarRoomScreen({
  position,
  rotation = 0,
  activeWaveCount = 0,
  activeTasks = 0,
}: WarRoomScreenProps) {
  const { width, height, depth, screenCount, screenHeight, screenMargin } = SCREEN_WALL;
  const screenWidth = (width - screenMargin * 2) / screenCount;
  const textureRef = useRef<CanvasTexture | null>(null);

  const waveTexture = useMemo(() => {
    if (activeWaveCount <= 0) return null;
    const tex = createWaveTexture(activeWaveCount, activeTasks);
    textureRef.current = tex;
    return tex;
  }, [activeWaveCount, activeTasks]);

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
        const isFirstScreen = i === 0 && waveTexture;
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
              {isFirstScreen ? (
                <meshStandardMaterial
                  map={waveTexture}
                  emissive="#003344"
                  emissiveIntensity={0.4}
                />
              ) : (
                <meshStandardMaterial
                  color={SCREEN_WALL.screenColor}
                  emissive={SCREEN_WALL.screenEmissive}
                  emissiveIntensity={activeWaveCount > 0 ? 0.5 : 0.2}
                />
              )}
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
