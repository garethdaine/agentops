'use client';

import { useMemo } from 'react';
import { BOOKSHELF } from '@/lib/furniture-geometry';

interface BookshelfProps {
  position: [number, number, number];
  rotation?: number;
  fillLevel?: number;
}

const BOOK_COLORS = ['#8b0000', '#00008b', '#006400', '#8b8b00', '#4b0082', '#cc6600'];

/** Generate deterministic book placements for a shelf. */
function generateBooks(shelfIndex: number, y: number, width: number, spacing: number) {
  const seed = shelfIndex * 7 + 3;
  const bookCount = 3 + (seed % 4);
  const bw = (width - 0.12) / bookCount;

  return Array.from({ length: bookCount }).map((_, b) => {
    const bh = spacing * 0.6 + ((seed + b * 13) % 100) / 100 * spacing * 0.25;
    const color = BOOK_COLORS[(seed + b) % BOOK_COLORS.length];
    const bx = -width / 2 + 0.08 + b * bw + bw / 2;
    return { x: bx, y: y + 0.02 + bh / 2, w: bw * 0.85, h: bh, color };
  });
}

/** Bookshelf with variable fill level and colored books. */
export default function Bookshelf({ position, rotation = 0, fillLevel = 0.7 }: BookshelfProps) {
  const { width, height, depth, sideThickness, shelfThickness, shelfCount, color } = BOOKSHELF;
  const spacing = height / (shelfCount + 1);

  const shelves = useMemo(() => {
    return Array.from({ length: shelfCount }).map((_, i) => {
      const y = (i + 1) * spacing;
      const filled = (i + 1) / shelfCount <= fillLevel;
      const books = filled ? generateBooks(i, y, width, spacing) : [];
      return { y, books };
    });
  }, [fillLevel, spacing, width]);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left side */}
      <mesh position={[-width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[sideThickness, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right side */}
      <mesh position={[width / 2, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[sideThickness, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Bottom */}
      <mesh position={[0, 0.01, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Shelves and books */}
      {shelves.map(({ y, books }, i) => (
        <group key={i}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[width - sideThickness, shelfThickness, depth]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {books.map((book, b) => (
            <mesh key={b} position={[book.x, book.y, 0]} castShadow>
              <boxGeometry args={[book.w, book.h, 0.22]} />
              <meshStandardMaterial color={book.color} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
