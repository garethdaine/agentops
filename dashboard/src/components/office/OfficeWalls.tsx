'use client';

import { WALL_PARTITIONS } from '@/lib/floorplan';
import { PARTITION } from '@/lib/furniture-geometry';

/**
 * Low wall partitions to suggest room structure.
 * REQ-032
 */
export default function OfficeWalls() {
  return (
    <group>
      {WALL_PARTITIONS.map((wall, i) => (
        <mesh
          key={i}
          position={wall.position}
          rotation={[0, wall.rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color={PARTITION.color}
            transparent
            opacity={PARTITION.opacity}
          />
        </mesh>
      ))}
    </group>
  );
}
