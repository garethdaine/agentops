'use client';

import { FILING_CABINET } from '@/lib/furniture-geometry';

interface FilingCabinetProps {
  position: [number, number, number];
  rotation?: number;
}

/** Filing cabinet with drawer lines and handles. */
export default function FilingCabinet({ position, rotation = 0 }: FilingCabinetProps) {
  const { width, height, depth, drawerCount, drawerSpacing, drawerStartY } = FILING_CABINET;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={FILING_CABINET.color} metalness={0.5} />
      </mesh>

      {/* Drawer lines and handles */}
      {Array.from({ length: drawerCount }).map((_, i) => {
        const y = drawerStartY + i * drawerSpacing;
        return (
          <group key={i}>
            {/* Drawer line */}
            <mesh position={[0, y, -depth / 2 - 0.003]}>
              <boxGeometry args={[width - 0.06, 0.01, 0.005]} />
              <meshStandardMaterial color={FILING_CABINET.drawerLineColor} />
            </mesh>
            {/* Handle */}
            <mesh position={[0, y, -depth / 2 - 0.01]}>
              <boxGeometry args={[0.08, 0.02, 0.02]} />
              <meshStandardMaterial color={FILING_CABINET.handleColor} metalness={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
