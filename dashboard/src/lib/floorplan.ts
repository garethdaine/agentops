import type { Zone, Workstation, Position3D } from '@/types/office';

/** Floor dimensions. */
export const FLOOR_WIDTH = 20;
export const FLOOR_DEPTH = 16;

/** Zone definitions for the office floor plan. */
export const ZONES: Zone[] = [
  {
    id: 'workstations',
    name: 'Workstations',
    position: { x: 0, y: 0, z: -1 },
    size: { width: 16, depth: 8 },
  },
  {
    id: 'serverRoom',
    name: 'Server Room',
    position: { x: -7, y: 0, z: -6.5 },
    size: { width: 4, depth: 3 },
  },
  {
    id: 'conference',
    name: 'Conference',
    position: { x: 6, y: 0, z: 5 },
    size: { width: 6, depth: 4 },
  },
  {
    id: 'breakRoom',
    name: 'Break Room',
    position: { x: -6, y: 0, z: 5.5 },
    size: { width: 5, depth: 3 },
  },
];

/** Zone tint colors (hex) — light office-style palette. */
export const ZONE_TINTS: Record<string, string> = {
  workstations: '#8899aa',
  serverRoom: '#7788a0',
  conference: '#99aabb',
  breakRoom: '#aabbcc',
};

/** Base floor color (hex) — light grey concrete. */
export const BASE_FLOOR_COLOR = '#9ca3af';

/** Workstation layout positions for 4-6 desks. */
export interface WorkstationSlot {
  position: [number, number, number];
  rotation: number;
}

export const WORKSTATION_SLOTS: WorkstationSlot[] = [
  { position: [-4.5, 0, -2], rotation: 0 },
  { position: [-1.5, 0, -2], rotation: 0 },
  { position: [1.5, 0, -2], rotation: 0 },
  { position: [4.5, 0, -2], rotation: 0 },
  { position: [-3, 0, 1], rotation: Math.PI },
  { position: [3, 0, 1], rotation: Math.PI },
];

/** Create initial workstation state objects from the slot definitions. */
export function createWorkstations(): Workstation[] {
  return WORKSTATION_SLOTS.map((slot, index) => ({
    index,
    position: {
      x: slot.position[0],
      y: slot.position[1],
      z: slot.position[2],
    },
    rotation: slot.rotation,
    occupied: false,
  }));
}

/** Wall partition definitions for low dividers. */
export interface WallPartition {
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  rotation: number;
}

export const WALL_PARTITIONS: WallPartition[] = [
  // Low back partition behind workstations (waist-height divider)
  { position: [0, 0.35, -4.5], size: [10, 0.7, 0.08], rotation: 0 },
  // Small side partition between workstation rows
  { position: [-6, 0.35, -1], size: [0.08, 0.7, 3], rotation: 0 },
  // Conference area low divider
  { position: [3, 0.35, 3], size: [0.08, 0.7, 2.5], rotation: 0 },
];
