'use client';

import {
  WALL_PARTITIONS,
  WALL_HEIGHT,
  WINDOW_OPENINGS,
  GLASS_PARTITIONS,
} from '@/lib/floorplan';
import { PARTITION, GLASS_MATERIAL } from '@/lib/furniture-geometry';

/** Renders a single glass window pane with frame bars. */
function WindowPane({ win }: { win: (typeof WINDOW_OPENINGS)[number] }) {
  const isEast = win.wall === 'east';
  const rotY = isEast ? Math.PI / 2 : 0;
  const pos: [number, number, number] = [win.centerX, win.centerY, win.centerZ];
  const size: [number, number, number] = isEast
    ? [0.15, win.height, win.width]
    : [win.width, win.height, 0.15];

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[win.width, win.height, 0.05]} />
        <meshPhysicalMaterial {...GLASS_MATERIAL} />
      </mesh>
    </group>
  );
}

/** Renders a glass or solid interior partition. */
function GlassPartition({ part }: { part: (typeof GLASS_PARTITIONS)[number] }) {
  const h = part.size[1];
  const y = h / 2;
  return (
    <mesh position={[part.position[0], y, part.position[2]]} castShadow receiveShadow>
      <boxGeometry args={part.size} />
      {part.glass ? (
        <meshPhysicalMaterial {...GLASS_MATERIAL} />
      ) : (
        <meshStandardMaterial color={PARTITION.color} opacity={PARTITION.opacity} />
      )}
    </mesh>
  );
}

/** Office perimeter walls, window panes, and interior glass partitions. */
export default function OfficeWalls() {
  return (
    <group>
      {WALL_PARTITIONS.map((wall, i) => (
        <mesh
          key={`wall-${i}`}
          position={wall.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#0f3460" />
        </mesh>
      ))}

      {WINDOW_OPENINGS.map((win, i) => (
        <WindowPane key={`win-${i}`} win={win} />
      ))}

      {GLASS_PARTITIONS.map((part, i) => (
        <GlassPartition key={`part-${i}`} part={part} />
      ))}
    </group>
  );
}
