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

// ─── Zone Furniture Placement Map ───────────────────────────────

/** A single furniture placement within a zone. */
export interface FurniturePlacement {
  type: string;
  position: [number, number, number];
  rotation?: number;
  /** Optional tool type for tool benches. */
  toolType?: string;
  /** Optional platform color for mail stations. */
  platformColor?: string;
  /** Optional fill level for bookshelves (0-1). */
  fillLevel?: number;
}

/**
 * Furniture placement arrays keyed by zone ID.
 * Positions are absolute world coordinates (matching reference buildZoneFurniture).
 */
export const ZONE_FURNITURE_MAP: Record<string, FurniturePlacement[]> = {
  serverRack: [
    { type: 'serverRack', position: [-12, 0, -8.5] },
    { type: 'serverRack', position: [-10.8, 0, -8.5] },
    { type: 'serverRack', position: [-9.6, 0, -8.5] },
    { type: 'serverRack', position: [-8.4, 0, -8.5] },
    { type: 'trafficLight', position: [-8.5, 0, -9] },
  ],
  warRoom: [
    { type: 'screenWall', position: [1, 0, -9.85] },
  ],
  securityDesk: [
    { type: 'barrierGate', position: [-9.5, 0, -3.5], rotation: Math.PI / 2 },
    { type: 'workstation', position: [-11.5, 0, -4.5] },
  ],
  workstations: [
    // Managed by WORKSTATION_SLOTS — placeholder for ZoneFurniture renderer
  ],
  mailroom: [
    { type: 'mailStation', position: [-11, 0, 1.5], platformColor: '#5865f2' },
    { type: 'mailStation', position: [-11, 0, 3.0], platformColor: '#4a154b' },
    { type: 'mailStation', position: [-11, 0, 4.5], platformColor: '#0088cc' },
  ],
  conference: [
    { type: 'conferenceTable', position: [-2, 0, 7] },
    { type: 'conferenceChair', position: [-3.2, 0, 8.0], rotation: Math.PI },
    { type: 'conferenceChair', position: [-2, 0, 8.0], rotation: Math.PI },
    { type: 'conferenceChair', position: [-0.8, 0, 8.0], rotation: Math.PI },
    { type: 'conferenceChair', position: [-3.2, 0, 6.0], rotation: 0 },
    { type: 'conferenceChair', position: [-2, 0, 6.0], rotation: 0 },
    { type: 'conferenceChair', position: [-0.8, 0, 6.0], rotation: 0 },
    { type: 'conferenceChair', position: [-4.3, 0, 7.0], rotation: Math.PI / 2 },
    { type: 'conferenceChair', position: [0.3, 0, 7.0], rotation: -Math.PI / 2 },
    { type: 'whiteboard', position: [-2, 1.5, 4.85] },
  ],
  vault: [
    { type: 'bookshelf', position: [8, 0, 5.5], fillLevel: 0.5 },
    { type: 'bookshelf', position: [9.5, 0, 5.5], fillLevel: 0.7 },
    { type: 'bookshelf', position: [11, 0, 5.5], fillLevel: 0.4 },
    { type: 'filingCabinet', position: [12, 0, 6] },
  ],
  toolWorkshop: [
    { type: 'toolBench', position: [-12, 0, 7], rotation: Math.PI, toolType: 'filesystem' },
    { type: 'toolBench', position: [-10.4, 0, 7], rotation: Math.PI, toolType: 'shell' },
    { type: 'toolBench', position: [-8.8, 0, 7], rotation: Math.PI, toolType: 'web' },
    { type: 'toolBench', position: [-7.2, 0, 7], rotation: Math.PI, toolType: 'mcp' },
    { type: 'filingCabinet', position: [-12, 0, 8.5] },
  ],
  breakRoom: [
    { type: 'kitchenCounter', position: [10, 0, 8.2] },
    { type: 'pingPongTable', position: [10, 0, 10.5] },
    { type: 'ideaBoard', position: [12.5, 1.6, 10.85] },
  ],
  escalation: [
    { type: 'alarmBell', position: [-8.1, 2.2, 1] },
  ],
};

// ─── Wall & Opening Types ──────────────────────────────────────

/** Perimeter wall height matching reference 3.2m. */
export const WALL_HEIGHT = 3.2;

const WALL_THICKNESS = 0.15;
const HALF_W = FLOOR_WIDTH / 2;
const HALF_D = FLOOR_DEPTH / 2;
const WALL_Y = WALL_HEIGHT / 2;

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface WallPartition {
  position: [number, number, number];
  size: [number, number, number];
  rotation: number;
  type: 'perimeter' | 'interior';
  side: WallSide;
}

export interface WindowOpening {
  wall: WallSide;
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
}

export interface DoorOpening {
  wall: WallSide;
  centerX: number;
  width: number;
  height: number;
}

export interface GlassPartitionDef {
  position: [number, number, number];
  size: [number, number, number];
  glass: boolean;
}

// ─── Window Positions (matching reference) ─────────────────────

const NORTH_WINDOW_CENTERS = [-9, -3, 3, 9];
const EAST_WINDOW_CENTERS = [-6, 0, 6];
const SOUTH_WINDOW_CENTERS = [-9, -3, 3, 9];
const WINDOW_WIDTH = 2.5;
const WINDOW_HEIGHT = 1.5;
const WINDOW_CENTER_Y = 1.8;

const NORTH_Z = -HALF_D;
const SOUTH_Z = HALF_D;
const EAST_X = HALF_W;

export const WINDOW_OPENINGS: WindowOpening[] = [
  ...NORTH_WINDOW_CENTERS.map((cx): WindowOpening => ({
    wall: 'north', centerX: cx, centerY: WINDOW_CENTER_Y,
    centerZ: NORTH_Z, width: WINDOW_WIDTH, height: WINDOW_HEIGHT,
  })),
  ...EAST_WINDOW_CENTERS.map((cz): WindowOpening => ({
    wall: 'east', centerX: EAST_X, centerY: WINDOW_CENTER_Y,
    centerZ: cz, width: WINDOW_WIDTH, height: WINDOW_HEIGHT,
  })),
  ...SOUTH_WINDOW_CENTERS.map((cx): WindowOpening => ({
    wall: 'south', centerX: cx, centerY: WINDOW_CENTER_Y,
    centerZ: SOUTH_Z, width: WINDOW_WIDTH, height: WINDOW_HEIGHT,
  })),
];

// ─── Door Opening ──────────────────────────────────────────────

export const DOOR_OPENING: DoorOpening = {
  wall: 'south',
  centerX: 12,
  width: 1.3,
  height: 2.5,
};

// ─── Glass Partitions (interior zone dividers) ─────────────────

export const GLASS_PARTITIONS: GlassPartitionDef[] = [
  { position: [-8, 0, -8.5], size: [0.1, WALL_HEIGHT * 0.85, 3], glass: true },
  { position: [-8, 0, -3.5], size: [0.1, WALL_HEIGHT * 0.85, 5], glass: true },
  { position: [-8, 0, 3], size: [0.1, WALL_HEIGHT * 0.85, 4], glass: true },
  { position: [-11.25, 0, -6.5], size: [6.5, WALL_HEIGHT * 0.85, 0.1], glass: false },
  { position: [0, 0, -6.5], size: [20, WALL_HEIGHT * 0.85, 0.1], glass: true },
  { position: [-8, 0, 5.5], size: [0.1, WALL_HEIGHT * 0.85, 1], glass: true },
  { position: [6.5, 0, 5], size: [0.1, WALL_HEIGHT * 0.85, 5], glass: true },
  { position: [6.5, 0, 7.5], size: [0.1, WALL_HEIGHT * 0.85, 1], glass: true },
];

// ─── Wall Segment Builder ──────────────────────────────────────

interface GapDef {
  center: number;
  width: number;
}

/** Split a wall span into solid segments around gaps. */
function buildWallSegments(
  totalLength: number,
  gaps: GapDef[],
): { center: number; width: number }[] {
  const halfTotal = totalLength / 2;
  const sorted = [...gaps]
    .map((g) => ({ start: g.center - g.width / 2, end: g.center + g.width / 2 }))
    .sort((a, b) => a.start - b.start);

  const segments: { center: number; width: number }[] = [];
  let cursor = -halfTotal;

  for (const gap of sorted) {
    if (gap.start > cursor) {
      const w = gap.start - cursor;
      segments.push({ center: cursor + w / 2, width: w });
    }
    cursor = gap.end;
  }
  if (cursor < halfTotal) {
    const w = halfTotal - cursor;
    segments.push({ center: cursor + w / 2, width: w });
  }
  return segments;
}

// ─── Perimeter Wall Segments ───────────────────────────────────

function createPerimeterWalls(): WallPartition[] {
  const walls: WallPartition[] = [];

  // North wall — gaps for 4 windows
  const northGaps = NORTH_WINDOW_CENTERS.map((c) => ({ center: c, width: WINDOW_WIDTH }));
  for (const seg of buildWallSegments(FLOOR_WIDTH, northGaps)) {
    walls.push({
      position: [seg.center, WALL_Y, NORTH_Z],
      size: [seg.width, WALL_HEIGHT, WALL_THICKNESS],
      rotation: 0, type: 'perimeter', side: 'north',
    });
  }

  // East wall — gaps for 3 windows
  const eastGaps = EAST_WINDOW_CENTERS.map((c) => ({ center: c, width: WINDOW_WIDTH }));
  for (const seg of buildWallSegments(FLOOR_DEPTH, eastGaps)) {
    walls.push({
      position: [EAST_X, WALL_Y, seg.center],
      size: [WALL_THICKNESS, WALL_HEIGHT, seg.width],
      rotation: 0, type: 'perimeter', side: 'east',
    });
  }

  // West wall — solid (no windows)
  walls.push({
    position: [-HALF_W, WALL_Y, 0],
    size: [WALL_THICKNESS, WALL_HEIGHT, FLOOR_DEPTH],
    rotation: 0, type: 'perimeter', side: 'west',
  });

  // South wall — gaps for 4 windows + door
  const southGaps: GapDef[] = [
    ...SOUTH_WINDOW_CENTERS.map((c) => ({ center: c, width: WINDOW_WIDTH })),
    { center: DOOR_OPENING.centerX, width: DOOR_OPENING.width },
  ];
  const southSegments = buildWallSegments(FLOOR_WIDTH, southGaps);
  for (const seg of southSegments) {
    walls.push({
      position: [seg.center, WALL_Y, SOUTH_Z],
      size: [seg.width, WALL_HEIGHT, WALL_THICKNESS],
      rotation: 0, type: 'perimeter', side: 'south',
    });
  }

  // Above-door segment
  const aboveDoorH = WALL_HEIGHT - DOOR_OPENING.height;
  if (aboveDoorH > 0.01) {
    walls.push({
      position: [
        DOOR_OPENING.centerX,
        DOOR_OPENING.height + aboveDoorH / 2,
        SOUTH_Z,
      ],
      size: [DOOR_OPENING.width, aboveDoorH, WALL_THICKNESS],
      rotation: 0, type: 'perimeter', side: 'south',
    });
  }

  return walls;
}

export const WALL_PARTITIONS: WallPartition[] = createPerimeterWalls();
