'use client';

import { PING_PONG_TABLE } from '@/lib/furniture-geometry';

interface PingPongTableProps {
  position: [number, number, number];
  rotation?: number;
}

/** Ping pong table with net and legs. */
export default function PingPongTable({ position, rotation = 0 }: PingPongTableProps) {
  const { width, height, depth, surfaceY, legHeight, legInset } = PING_PONG_TABLE;
  const legW = width / 2 - legInset;
  const legD = depth / 2 - legInset;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Table surface */}
      <mesh position={[0, surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={PING_PONG_TABLE.color} />
      </mesh>

      {/* Net */}
      <mesh position={[0, surfaceY + PING_PONG_TABLE.netHeight / 2 + height / 2, 0]} castShadow>
        <boxGeometry args={[PING_PONG_TABLE.netWidth, PING_PONG_TABLE.netHeight, depth]} />
        <meshStandardMaterial color={PING_PONG_TABLE.netColor} />
      </mesh>

      {/* Legs */}
      {[
        [-legW, legHeight / 2, -legD],
        [legW, legHeight / 2, -legD],
        [-legW, legHeight / 2, legD],
        [legW, legHeight / 2, legD],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, legHeight, 8]} />
          <meshStandardMaterial color={PING_PONG_TABLE.legColor} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
