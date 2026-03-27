'use client';

import { BARRIER_GATE } from '@/lib/furniture-geometry';

interface BarrierGateProps {
  position: [number, number, number];
  rotation?: number;
}

/** Security barrier gate with post, arm, and LED indicator. */
export default function BarrierGate({ position, rotation = 0 }: BarrierGateProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Post */}
      <mesh position={[0, BARRIER_GATE.postHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BARRIER_GATE.postRadius, BARRIER_GATE.postRadius + 0.01, BARRIER_GATE.postHeight, 12]} />
        <meshStandardMaterial color={BARRIER_GATE.color} metalness={0.6} />
      </mesh>

      {/* Arm */}
      <mesh position={[BARRIER_GATE.armWidth / 2, BARRIER_GATE.postHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[BARRIER_GATE.armWidth, BARRIER_GATE.armHeight, BARRIER_GATE.armDepth]} />
        <meshStandardMaterial color={BARRIER_GATE.armColor} />
      </mesh>

      {/* LED */}
      <mesh position={[0, BARRIER_GATE.postHeight + 0.1, 0]}>
        <sphereGeometry args={[BARRIER_GATE.ledRadius, 12, 8]} />
        <meshStandardMaterial
          color={BARRIER_GATE.ledColor}
          emissive={BARRIER_GATE.ledColor}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}
