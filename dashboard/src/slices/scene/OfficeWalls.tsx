'use client';

import {
  WALL_PARTITIONS,
  WALL_HEIGHT,
  WINDOW_OPENINGS,
  GLASS_PARTITIONS,
  DOOR_OPENING,
  FLOOR_DEPTH,
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

/** Renders wall below and above each window opening to fill the full wall height. */
function WindowSurround({ win }: { win: (typeof WINDOW_OPENINGS)[number] }) {
  const isEast = win.wall === 'east';
  const belowH = win.centerY - win.height / 2;
  const aboveBottom = win.centerY + win.height / 2;
  const aboveH = WALL_HEIGHT - aboveBottom;
  const thickness = 0.15;

  const size = (h: number): [number, number, number] =>
    isEast ? [thickness, h, win.width] : [win.width, h, thickness];

  return (
    <group>
      {/* Wall below window */}
      {belowH > 0.01 && (
        <mesh position={[win.centerX, belowH / 2, win.centerZ]} castShadow receiveShadow>
          <boxGeometry args={size(belowH)} />
          <meshStandardMaterial color="#0f3460" />
        </mesh>
      )}
      {/* Wall above window */}
      {aboveH > 0.01 && (
        <mesh position={[win.centerX, aboveBottom + aboveH / 2, win.centerZ]} castShadow receiveShadow>
          <boxGeometry args={size(aboveH)} />
          <meshStandardMaterial color="#0f3460" />
        </mesh>
      )}
    </group>
  );
}

/** Renders a door frame (two vertical posts + lintel) at the south door opening. */
function DoorFrame() {
  const doorX = DOOR_OPENING.centerX;
  const doorZ = FLOOR_DEPTH / 2;
  const doorW = DOOR_OPENING.width;
  const doorH = DOOR_OPENING.height;
  const postW = 0.1;
  const postD = 0.2;
  const frameColor = '#3d2418';

  return (
    <group>
      {/* Left post */}
      <mesh position={[doorX - doorW / 2 - postW / 2, doorH / 2, doorZ]}>
        <boxGeometry args={[postW, doorH, postD]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      {/* Right post */}
      <mesh position={[doorX + doorW / 2 + postW / 2, doorH / 2, doorZ]}>
        <boxGeometry args={[postW, doorH, postD]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      {/* Lintel */}
      <mesh position={[doorX, doorH + postW / 2, doorZ]}>
        <boxGeometry args={[doorW + postW * 2, postW, postD]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
    </group>
  );
}

/** Office perimeter walls, window panes, window surrounds, door frame, and interior glass partitions. */
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
        <group key={`win-group-${i}`}>
          <WindowPane win={win} />
          <WindowSurround win={win} />
        </group>
      ))}

      <DoorFrame />

      {GLASS_PARTITIONS.map((part, i) => (
        <GlassPartition key={`part-${i}`} part={part} />
      ))}
    </group>
  );
}
