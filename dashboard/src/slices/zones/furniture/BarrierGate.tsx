'use client';

import { BARRIER_GATE } from '@/lib/furniture-geometry';
import { usePulsingEmissive } from '../hooks/usePulsingEmissive';
import type { BarrierLedState } from '../zone-feedback';

interface BarrierGateProps {
  position: [number, number, number];
  rotation?: number;
  /** LED state derived from runtime mode. */
  ledState?: BarrierLedState;
}

/** Security barrier gate with post, arm, and LED indicator. */
export default function BarrierGate({ position, rotation = 0, ledState }: BarrierGateProps) {
  const ledColor = ledState?.color ?? BARRIER_GATE.ledColor;

  const matRef = usePulsingEmissive({
    color: ledColor,
    mode: 'static',
    intensity: 0.6,
  });

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
          ref={matRef}
          color={ledColor}
          emissive={ledColor}
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
