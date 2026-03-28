/**
 * Outdoor environment layout data.
 * Positions are absolute world coordinates matching the reference buildOutdoorEnvironment().
 */
import { FLOOR_WIDTH, FLOOR_DEPTH } from './floorplan';

// ─── Parking Lot ─────────────────────────────────────────────

export interface ParkingLotConfig {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  lineCount: number;
  lineSpacing: number;
  surfaceColor: string;
  lineColor: string;
}

export const PARKING_LOT: ParkingLotConfig = {
  centerX: 23,
  centerZ: -1,
  width: 16,
  depth: 14,
  lineCount: 5,
  lineSpacing: 3.5,
  surfaceColor: '#333333',
  lineColor: '#cccccc',
};

// ─── Cars ────────────────────────────────────────────────────

export interface CarPosition {
  x: number;
  z: number;
  rotation: number;
  color: string;
}

const CAR_COLORS = ['#3366aa', '#cc3333', '#222222', '#dddddd'] as const;

export const CAR_POSITIONS: CarPosition[] = [
  { x: 19, z: -4, rotation: 0, color: CAR_COLORS[0] },
  { x: 23, z: -4, rotation: 0, color: CAR_COLORS[1] },
  { x: 19, z: 2, rotation: Math.PI, color: CAR_COLORS[2] },
  { x: 23, z: 2, rotation: Math.PI, color: CAR_COLORS[3] },
];

// ─── Flower Beds ─────────────────────────────────────────────

export interface FlowerBedPosition {
  x: number;
  z: number;
  width: number;
  depth: number;
  flowerColor: string;
}

const NORTH_Z = -(FLOOR_DEPTH / 2) - 1.2;
const SOUTH_Z = (FLOOR_DEPTH / 2) + 1.2;

export const FLOWER_BED_POSITIONS: FlowerBedPosition[] = [
  // North flower beds (3)
  { x: -4, z: NORTH_Z, width: 2.5, depth: 0.8, flowerColor: '#e74c3c' },
  { x: 2, z: NORTH_Z, width: 2.5, depth: 0.8, flowerColor: '#f39c12' },
  { x: 8, z: NORTH_Z, width: 2.5, depth: 0.8, flowerColor: '#9b59b6' },
  // South flower beds (2)
  { x: 8, z: SOUTH_Z, width: 2.5, depth: 0.8, flowerColor: '#2ecc71' },
  { x: 14, z: SOUTH_Z, width: 2.5, depth: 0.8, flowerColor: '#3498db' },
];

// ─── Outdoor Benches ─────────────────────────────────────────

export interface OutdoorBenchPosition {
  x: number;
  z: number;
  rotation: number;
}

export const OUTDOOR_BENCH_POSITIONS: OutdoorBenchPosition[] = [
  { x: -4, z: SOUTH_Z + 1.5, rotation: 0 },
  { x: 2, z: SOUTH_Z + 1.5, rotation: 0 },
];

// ─── Lamp Posts ──────────────────────────────────────────────

export interface LampPostPosition {
  x: number;
  z: number;
}

export const LAMP_POST_POSITIONS: LampPostPosition[] = [
  { x: FLOOR_WIDTH / 2 + 1.5, z: -8 },
  { x: FLOOR_WIDTH / 2 + 1.5, z: 0 },
  { x: FLOOR_WIDTH / 2 + 1.5, z: 8 },
];

// ─── Bollards ────────────────────────────────────────────────

export interface BollardPosition {
  x: number;
  z: number;
}

export const BOLLARD_POSITIONS: BollardPosition[] = [
  { x: PARKING_LOT.centerX - PARKING_LOT.width / 2, z: -6 },
  { x: PARKING_LOT.centerX - PARKING_LOT.width / 2, z: -2 },
  { x: PARKING_LOT.centerX - PARKING_LOT.width / 2, z: 2 },
  { x: PARKING_LOT.centerX - PARKING_LOT.width / 2, z: 6 },
];

// ─── Walkway ─────────────────────────────────────────────────

export interface WalkwayConfig {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  color: string;
}

export const WALKWAY: WalkwayConfig = {
  centerX: 12,
  centerZ: FLOOR_DEPTH / 2 + 2,
  width: 3,
  depth: 4,
  color: '#888888',
};
