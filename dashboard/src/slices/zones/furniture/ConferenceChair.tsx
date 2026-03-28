'use client';

import { CONFERENCE_CHAIR } from '@/lib/furniture-geometry';

interface ConferenceChairProps {
  position: [number, number, number];
  rotation?: number;
}

/** Conference chair with seat, back, and central stem. */
export default function ConferenceChair({ position, rotation = 0 }: ConferenceChairProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, CONFERENCE_CHAIR.seatY, 0]} castShadow receiveShadow>
        <boxGeometry args={[CONFERENCE_CHAIR.seatWidth, CONFERENCE_CHAIR.seatHeight, CONFERENCE_CHAIR.seatDepth]} />
        <meshStandardMaterial color={CONFERENCE_CHAIR.color} />
      </mesh>

      {/* Back */}
      <mesh position={[0, CONFERENCE_CHAIR.backY, -0.16]} castShadow receiveShadow>
        <boxGeometry args={[CONFERENCE_CHAIR.backWidth, CONFERENCE_CHAIR.backHeight, CONFERENCE_CHAIR.backDepth]} />
        <meshStandardMaterial color={CONFERENCE_CHAIR.color} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, CONFERENCE_CHAIR.stemHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CONFERENCE_CHAIR.stemRadius, CONFERENCE_CHAIR.stemRadius, CONFERENCE_CHAIR.stemHeight, 12]} />
        <meshStandardMaterial color={CONFERENCE_CHAIR.stemColor} metalness={0.7} />
      </mesh>
    </group>
  );
}
