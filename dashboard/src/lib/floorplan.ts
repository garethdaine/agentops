import type { Zone, Workstation, Position3D } from '@/types/office';

/** Floor dimensions matching reference 28x22 layout. */
export const FLOOR_WIDTH = 28;
export const FLOOR_DEPTH = 22;

/**
 * Zone definitions for the office floor plan.
 * 10 zones matching the reference layout with positions and sizes.
 */
export const ZONES: Zone[] = [
  /** Server racks with LED health indicators and traffic light. */
  {
    id: 'serverRack',
    name: 'Server Room',
    position: { x: -10.5, y: 0, z: -8.5 },
    size: { width: 5, depth: 3 },
  },
  /** Operations wall with 6-screen display for active run monitoring. */
  {
    id: 'warRoom',
    name: 'War Room',
    position: { x: 1, y: 0, z: -8.5 },
    size: { width: 18, depth: 3 },
  },
  /** Security checkpoint with barrier gate and runtime-mode LEDs. */
  {
    id: 'securityDesk',
    name: 'Security',
    position: { x: -11, y: 0, z: -3.5 },
    size: { width: 4, depth: 5 },
  },
  /** Primary agent workspace with 9 desk slots in a 2-row grid. */
  {
    id: 'workstations',
    name: 'Workstations',
    position: { x: 2, y: 0, z: -2.5 },
    size: { width: 22, depth: 7 },
  },
  /** Communications hub with Discord/Slack/Telegram-style mail stations. */
  {
    id: 'mailroom',
    name: 'Comms Hub',
    position: { x: -11, y: 0, z: 3 },
    size: { width: 4, depth: 4 },
  },
  /** Meeting area with table, 8 chairs, and whiteboard for delegation. */
  {
    id: 'conference',
    name: 'Conference Room',
    position: { x: -2, y: 0, z: 7 },
    size: { width: 12, depth: 4 },
  },
  /** Archives with bookshelves and filing cabinet for knowledge storage. */
  {
    id: 'vault',
    name: 'Archives',
    position: { x: 10, y: 0, z: 6 },
    size: { width: 6, depth: 3 },
  },
  /** Tool benches for filesystem, shell, web, and MCP tool types. */
  {
    id: 'toolWorkshop',
    name: 'Tool Workshop',
    position: { x: -10, y: 0, z: 7 },
    size: { width: 6, depth: 4 },
  },
  /** Relaxation area with kitchen counter, ping pong table, and idea board. */
  {
    id: 'breakRoom',
    name: 'Break Room',
    position: { x: 10, y: 0, z: 9.5 },
    size: { width: 6, depth: 3 },
  },
  /** Alarm zone with pulsing bell for rate-limited or overloaded states. */
  {
    id: 'escalation',
    name: 'Escalation',
    position: { x: -8, y: 0, z: 1 },
    size: { width: 2, depth: 2 },
  },
];

/** Zone tint colors (hex) — dark office-style palette matching reference. */
export const ZONE_TINTS: Record<string, string> = {
  serverRack: '#12182e',
  warRoom: '#141e36',
  securityDesk: '#1a1620',
  workstations: '#16213e',
  mailroom: '#161e30',
  conference: '#141a30',
  vault: '#18162a',
  toolWorkshop: '#161620',
  breakRoom: '#1a1e22',
  escalation: '#1a1020',
};

/** Base floor color (hex) — dark navy concrete. */
export const BASE_FLOOR_COLOR = '#0e1629';

/** Workstation slot layout definition. */
export interface WorkstationSlot {
  position: [number, number, number];
  rotation: number;
}

/** Workstation layout positions — 9 desks in a 2-row grid. */
export const WORKSTATION_SLOTS: WorkstationSlot[] = [
  // Row 1 (front): 4 desks facing forward
  { position: [-6, 0, -4], rotation: 0 },
  { position: [-3, 0, -4], rotation: 0 },
  { position: [0, 0, -4], rotation: 0 },
  { position: [3, 0, -4], rotation: 0 },
  // Row 2 (back): 5 desks facing backward
  { position: [-6, 0, -1], rotation: Math.PI },
  { position: [-3, 0, -1], rotation: Math.PI },
  { position: [0, 0, -1], rotation: Math.PI },
  { position: [3, 0, -1], rotation: Math.PI },
  { position: [6, 0, -1], rotation: Math.PI },
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

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.12;
const HALF_W = FLOOR_WIDTH / 2;
const HALF_D = FLOOR_DEPTH / 2;
const WALL_Y = WALL_HEIGHT / 2;

export const WALL_PARTITIONS: WallPartition[] = [
  // Back wall (full width)
  { position: [0, WALL_Y, -HALF_D], size: [FLOOR_WIDTH, WALL_HEIGHT, WALL_THICKNESS], rotation: 0 },
  // Front wall left section (with door gap)
  { position: [-(FLOOR_WIDTH / 4), WALL_Y, HALF_D], size: [FLOOR_WIDTH / 2, WALL_HEIGHT, WALL_THICKNESS], rotation: 0 },
  // Front wall right section
  { position: [FLOOR_WIDTH / 4, WALL_Y, HALF_D], size: [FLOOR_WIDTH / 2, WALL_HEIGHT, WALL_THICKNESS], rotation: 0 },
  // Left wall
  { position: [-HALF_W, WALL_Y, 0], size: [WALL_THICKNESS, WALL_HEIGHT, FLOOR_DEPTH], rotation: 0 },
  // Right wall
  { position: [HALF_W, WALL_Y, 0], size: [WALL_THICKNESS, WALL_HEIGHT, FLOOR_DEPTH], rotation: 0 },
];
