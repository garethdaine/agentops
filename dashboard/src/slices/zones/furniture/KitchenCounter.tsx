'use client';

import { KITCHEN_COUNTER } from '@/lib/furniture-geometry';

interface KitchenCounterProps {
  position: [number, number, number];
  rotation?: number;
}

/** Kitchen counter with cabinet and surface. */
export default function KitchenCounter({ position, rotation = 0 }: KitchenCounterProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Counter surface */}
      <mesh position={[0, KITCHEN_COUNTER.surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[KITCHEN_COUNTER.width, KITCHEN_COUNTER.height, KITCHEN_COUNTER.depth]} />
        <meshStandardMaterial color={KITCHEN_COUNTER.color} />
      </mesh>

      {/* Cabinet */}
      <mesh position={[0, KITCHEN_COUNTER.cabinetHeight / 2, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[KITCHEN_COUNTER.cabinetWidth, KITCHEN_COUNTER.cabinetHeight, KITCHEN_COUNTER.cabinetDepth]} />
        <meshStandardMaterial color={KITCHEN_COUNTER.cabinetColor} />
      </mesh>
    </group>
  );
}
