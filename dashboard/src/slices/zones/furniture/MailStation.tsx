'use client';

import { DESK, MAIL_STATION } from '@/lib/furniture-geometry';

interface MailStationProps {
  position: [number, number, number];
  rotation?: number;
  platformColor?: string;
}

/** Mail station desk with colored platform and letter tray. */
export default function MailStation({ position, rotation = 0, platformColor = '#5865f2' }: MailStationProps) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk surface */}
      <mesh position={[0, DESK.surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAIL_STATION.deskWidth, DESK.height, MAIL_STATION.deskDepth]} />
        <meshStandardMaterial color={MAIL_STATION.color} />
      </mesh>

      {/* Desk legs */}
      {[
        [-MAIL_STATION.deskWidth / 2 + 0.04, DESK.legHeight / 2, -MAIL_STATION.deskDepth / 2 + 0.04],
        [MAIL_STATION.deskWidth / 2 - 0.04, DESK.legHeight / 2, -MAIL_STATION.deskDepth / 2 + 0.04],
        [-MAIL_STATION.deskWidth / 2 + 0.04, DESK.legHeight / 2, MAIL_STATION.deskDepth / 2 - 0.04],
        [MAIL_STATION.deskWidth / 2 - 0.04, DESK.legHeight / 2, MAIL_STATION.deskDepth / 2 - 0.04],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[DESK.legRadius, DESK.legRadius, DESK.legHeight, 8]} />
          <meshStandardMaterial color={DESK.legColor} metalness={0.6} />
        </mesh>
      ))}

      {/* Colored platform */}
      <mesh position={[-0.2, DESK.surfaceY + MAIL_STATION.platformHeight / 2 + 0.02, 0]} castShadow>
        <boxGeometry args={[MAIL_STATION.platformWidth, MAIL_STATION.platformHeight, MAIL_STATION.platformDepth]} />
        <meshStandardMaterial color={platformColor} emissive={platformColor} emissiveIntensity={0.2} />
      </mesh>

      {/* Letter tray */}
      <mesh position={[0.2, DESK.surfaceY + MAIL_STATION.trayHeight / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAIL_STATION.trayWidth, MAIL_STATION.trayHeight, MAIL_STATION.trayDepth]} />
        <meshStandardMaterial color="#dddddd" />
      </mesh>

      {/* Letter */}
      <mesh position={[0.2, DESK.surfaceY + MAIL_STATION.trayHeight + 0.03, 0]}>
        <boxGeometry args={[0.22, 0.01, 0.12]} />
        <meshStandardMaterial color="#ffeecc" />
      </mesh>
    </group>
  );
}
