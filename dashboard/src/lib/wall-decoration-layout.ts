/**
 * Wall decoration layout data.
 * Pure data module -- no React/Three.js imports for testability.
 */

import { FLOOR_WIDTH, FLOOR_DEPTH } from '@/lib/floorplan';

export type WallSide = 'north' | 'south' | 'east' | 'west';
export type DecorationType = 'picture' | 'poster' | 'tv' | 'clock';

export interface WallDecorationItem {
  type: DecorationType;
  wall: WallSide;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  seed?: number;
}

/** Wall surface offset -- decorations sit 0.1 units from the wall. */
const WALL_OFFSET = 0.1;

const HALF_W = FLOOR_WIDTH / 2;
const HALF_D = FLOOR_DEPTH / 2;

/** North wall: z = -HALF_D + WALL_OFFSET, faces +Z (rotationY = 0). */
function northItem(
  type: DecorationType,
  x: number,
  y: number,
  seed?: number,
): WallDecorationItem {
  return { type, wall: 'north', x, y, z: -HALF_D + WALL_OFFSET, rotationY: 0, seed };
}

/** South wall: z = +HALF_D - WALL_OFFSET, faces -Z (rotationY = PI). */
function southItem(
  type: DecorationType,
  x: number,
  y: number,
  seed?: number,
): WallDecorationItem {
  return { type, wall: 'south', x, y, z: HALF_D - WALL_OFFSET, rotationY: Math.PI, seed };
}

/** East wall: x = +HALF_W - WALL_OFFSET, faces -X (rotationY = -PI/2). */
function eastItem(
  type: DecorationType,
  z: number,
  y: number,
  seed?: number,
): WallDecorationItem {
  return { type, wall: 'east', x: HALF_W - WALL_OFFSET, y, z, rotationY: -Math.PI / 2, seed };
}

/** West wall: x = -HALF_W + WALL_OFFSET, faces +X (rotationY = PI/2). */
function westItem(
  type: DecorationType,
  z: number,
  y: number,
  seed?: number,
): WallDecorationItem {
  return { type, wall: 'west', x: -HALF_W + WALL_OFFSET, y, z, rotationY: Math.PI / 2, seed };
}

/**
 * All wall decoration items across the 4 perimeter walls.
 * Positions avoid window openings (N: x=-9,-3,3,9; E: z=-6,0,6; S: x=-9,-3,3,9).
 */
export const WALL_DECORATION_ITEMS: WallDecorationItem[] = [
  // ── North wall: 3 pictures + 1 clock ──
  northItem('picture', -6, 2.0, 1),
  northItem('picture', 0, 2.2, 2),
  northItem('picture', 6, 2.0, 3),
  northItem('clock', 10, 2.4),

  // ── South wall: 2 posters + 1 TV ──
  southItem('poster', -6, 2.0, 10),
  southItem('tv', 0, 2.0),
  southItem('poster', 6, 2.0, 11),

  // ── East wall: 2 pictures + 1 poster ──
  eastItem('picture', -3, 2.0, 20),
  eastItem('picture', 3, 2.2, 21),
  eastItem('poster', 8, 1.8, 22),

  // ── West wall: 1 TV + 1 poster + 1 clock ──
  westItem('tv', -4, 2.0),
  westItem('poster', 2, 2.0, 30),
  westItem('clock', 7, 2.4),
];
