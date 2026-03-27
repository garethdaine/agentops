'use client';

import { CONFERENCE_TABLE } from '@/lib/furniture-geometry';

interface ConferenceTableProps {
  position: [number, number, number];
  rotation?: number;
}

/** Conference table with two cylindrical legs. */
export default function ConferenceTable({ position, rotation = 0 }: ConferenceTableProps) {
  const { length, width, height, surfaceY, legRadius, legHeight, legColor } = CONFERENCE_TABLE;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Table surface */}
      <mesh position={[0, surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, height, width]} />
        <meshStandardMaterial color={CONFERENCE_TABLE.color} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-length / 2 + 0.3, legHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[legRadius, legRadius, legHeight, 12]} />
        <meshStandardMaterial color={legColor} metalness={0.6} />
      </mesh>

      {/* Right leg */}
      <mesh position={[length / 2 - 0.3, legHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[legRadius, legRadius, legHeight, 12]} />
        <meshStandardMaterial color={legColor} metalness={0.6} />
      </mesh>
    </group>
  );
}
