'use client';

import { useMemo } from 'react';
import { IDEA_BOARD } from '@/lib/furniture-geometry';

interface IdeaBoardProps {
  position: [number, number, number];
  rotation?: number;
}

/** Idea board with deterministic sticky note placements. */
export default function IdeaBoard({ position, rotation = 0 }: IdeaBoardProps) {
  const notes = useMemo(() => {
    return Array.from({ length: IDEA_BOARD.noteCount }).map((_, i) => {
      const seed = i * 17 + 5;
      const nx = -0.5 + ((seed * 31) % 100) / 100;
      const ny = -0.35 + ((seed * 47) % 100) / 100 * 0.7;
      const color = IDEA_BOARD.noteColors[seed % IDEA_BOARD.noteColors.length];
      return { x: nx, y: ny, color };
    });
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Board */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[IDEA_BOARD.width, IDEA_BOARD.height, IDEA_BOARD.depth]} />
        <meshStandardMaterial color={IDEA_BOARD.color} />
      </mesh>

      {/* Sticky notes */}
      {notes.map(({ x, y, color }, i) => (
        <mesh key={i} position={[x, y, -IDEA_BOARD.depth / 2 - 0.003]}>
          <boxGeometry args={[IDEA_BOARD.noteSize, IDEA_BOARD.noteSize, 0.005]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
