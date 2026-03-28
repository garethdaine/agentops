'use client';

import { DESK, TOOL_BENCH } from '@/lib/furniture-geometry';

interface ToolBenchProps {
  position: [number, number, number];
  rotation?: number;
  toolType?: string;
}

/** Tool bench (desk variant) with accent-colored status screen. */
export default function ToolBench({ position, rotation = 0, toolType = 'generic' }: ToolBenchProps) {
  const accentColors = TOOL_BENCH.accentColors as Record<string, string>;
  const accent = accentColors[toolType] ?? accentColors.generic;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk surface */}
      <mesh position={[0, DESK.surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[TOOL_BENCH.width, DESK.height, TOOL_BENCH.depth]} />
        <meshStandardMaterial color={TOOL_BENCH.color} />
      </mesh>

      {/* Desk legs */}
      {[
        [-TOOL_BENCH.width / 2 + 0.04, DESK.legHeight / 2, -TOOL_BENCH.depth / 2 + 0.04],
        [TOOL_BENCH.width / 2 - 0.04, DESK.legHeight / 2, -TOOL_BENCH.depth / 2 + 0.04],
        [-TOOL_BENCH.width / 2 + 0.04, DESK.legHeight / 2, TOOL_BENCH.depth / 2 - 0.04],
        [TOOL_BENCH.width / 2 - 0.04, DESK.legHeight / 2, TOOL_BENCH.depth / 2 - 0.04],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[DESK.legRadius, DESK.legRadius, DESK.legHeight, 8]} />
          <meshStandardMaterial color={DESK.legColor} metalness={0.6} />
        </mesh>
      ))}

      {/* Status screen casing */}
      <mesh position={[0, 0.92, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[TOOL_BENCH.screenWidth, TOOL_BENCH.screenHeight, TOOL_BENCH.screenDepth]} />
        <meshStandardMaterial color={TOOL_BENCH.screenColor} />
      </mesh>

      {/* Status indicator */}
      <mesh position={[0, 0.92, -0.14]}>
        <boxGeometry args={[TOOL_BENCH.indicatorWidth, TOOL_BENCH.indicatorHeight, 0.005]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
