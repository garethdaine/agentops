'use client';

import { ALARM_BELL } from '@/lib/furniture-geometry';

interface AlarmBellProps {
  position: [number, number, number];
  rotation?: number;
}

/** Alarm bell with backplate, bell dome, and LED indicator. */
export default function AlarmBell({ position, rotation = 0 }: AlarmBellProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Backplate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[ALARM_BELL.backplateWidth, ALARM_BELL.backplateHeight, ALARM_BELL.backplateDepth]} />
        <meshStandardMaterial color={ALARM_BELL.color} />
      </mesh>

      {/* Bell dome */}
      <mesh position={[0, 0, -ALARM_BELL.backplateDepth / 2 - ALARM_BELL.bellHeight / 2]}>
        <cylinderGeometry args={[ALARM_BELL.bellRadiusTop, ALARM_BELL.bellRadiusBottom, ALARM_BELL.bellHeight, 12]} />
        <meshStandardMaterial color={ALARM_BELL.bellColor} />
      </mesh>

      {/* LED */}
      <mesh position={[0.06, 0.06, -ALARM_BELL.backplateDepth / 2 - 0.01]}>
        <sphereGeometry args={[ALARM_BELL.ledRadius, 12, 8]} />
        <meshStandardMaterial
          color={ALARM_BELL.ledColor}
          emissive={ALARM_BELL.ledColor}
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  );
}
