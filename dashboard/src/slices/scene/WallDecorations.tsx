'use client';

import { useMemo } from 'react';
import { WALL_DECORATION_ITEMS, type WallDecorationItem } from '@/lib/wall-decoration-layout';
import {
  WALL_PICTURE,
  WALL_POSTER,
  WALL_TV,
  WALL_CLOCK,
} from '@/lib/furniture-geometry';

// ── Seeded color generation ─────────────────────────────────────

function seededColor(seed: number): string {
  const hue = (seed * 137.508) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

// ── Sub-components (SRP per decoration type) ────────────────────

function WallPicture({ item }: { item: WallDecorationItem }) {
  const color = useMemo(() => seededColor(item.seed ?? 0), [item.seed]);
  return (
    <mesh>
      <boxGeometry args={[WALL_PICTURE.width, WALL_PICTURE.height, WALL_PICTURE.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function WallPoster({ item }: { item: WallDecorationItem }) {
  const color = useMemo(() => seededColor((item.seed ?? 0) + 50), [item.seed]);
  return (
    <mesh>
      <boxGeometry args={[WALL_POSTER.width, WALL_POSTER.height, WALL_POSTER.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function WallTV() {
  return (
    <mesh>
      <boxGeometry args={[WALL_TV.width, WALL_TV.height, WALL_TV.depth]} />
      <meshStandardMaterial
        color={WALL_TV.color}
        emissive={WALL_TV.emissive}
        emissiveIntensity={WALL_TV.emissiveIntensity}
      />
    </mesh>
  );
}

function WallClock() {
  return (
    <group>
      <mesh>
        <circleGeometry args={[WALL_CLOCK.radius, WALL_CLOCK.segments]} />
        <meshStandardMaterial color={WALL_CLOCK.faceColor} />
      </mesh>
      {/* Hour hand */}
      <mesh position={[0, 0.04, 0.005]}>
        <boxGeometry args={[0.015, 0.1, 0.005]} />
        <meshStandardMaterial color={WALL_CLOCK.handColor} />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0.03, 0, 0.005]} rotation={[0, 0, -Math.PI / 3]}>
        <boxGeometry args={[0.01, 0.14, 0.005]} />
        <meshStandardMaterial color={WALL_CLOCK.handColor} />
      </mesh>
    </group>
  );
}

// ── Decoration renderer ─────────────────────────────────────────

function renderDecoration(item: WallDecorationItem) {
  switch (item.type) {
    case 'picture':
      return <WallPicture item={item} />;
    case 'poster':
      return <WallPoster item={item} />;
    case 'tv':
      return <WallTV />;
    case 'clock':
      return <WallClock />;
  }
}

// ── Main component ──────────────────────────────────────────────

/** Renders wall decorations (pictures, posters, TVs, clocks) on interior wall surfaces. */
export default function WallDecorations() {
  return (
    <group>
      {WALL_DECORATION_ITEMS.map((item, i) => (
        <group
          key={`deco-${item.wall}-${i}`}
          position={[item.x, item.y, item.z]}
          rotation={[0, item.rotationY, 0]}
        >
          {renderDecoration(item)}
        </group>
      ))}
    </group>
  );
}
