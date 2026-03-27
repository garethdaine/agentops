'use client';

import { ZONES, ZONE_TINTS, BASE_FLOOR_COLOR, FLOOR_WIDTH, FLOOR_DEPTH } from '@/lib/floorplan';

/**
 * Floor plane with zone tinting.
 * REQ-028
 */
export default function OfficeFloor() {
  return (
    <group>
      {/* Grass ground plane extending to horizon */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4a7c3f" />
      </mesh>

      {/* Base floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_WIDTH + 2, FLOOR_DEPTH + 2]} />
        <meshStandardMaterial color={BASE_FLOOR_COLOR} />
      </mesh>

      {/* Zone tinted areas */}
      {ZONES.map((zone) => (
        <mesh
          key={zone.id}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[zone.position.x, 0.005, zone.position.z]}
          receiveShadow
        >
          <planeGeometry args={[zone.size.width, zone.size.depth]} />
          <meshStandardMaterial color={ZONE_TINTS[zone.id] ?? BASE_FLOOR_COLOR} />
        </mesh>
      ))}
    </group>
  );
}
