/**
 * Procedural furniture dimensions and constants.
 * All measurements in Three.js world units (roughly 1 unit = 1 meter).
 */

/** Desk dimensions. */
export const DESK = {
  width: 1.4,
  height: 0.04,
  depth: 0.7,
  surfaceY: 0.74,
  legRadius: 0.03,
  legHeight: 0.72,
  color: '#b8956a',
  legColor: '#555555',
} as const;

/** Monitor dimensions. */
export const MONITOR = {
  width: 0.5,
  height: 0.35,
  depth: 0.05,
  screenInset: 0.03,
  screenDepth: 0.003,
  centerY: 0.94,
  centerZ: -0.1,
  standRadius: 0.03,
  standHeight: 0.16,
  baseWidth: 0.15,
  baseDepth: 0.1,
  casingColor: '#1a1a1a',
  standColor: '#333333',
} as const;

/** Canvas texture dimensions for monitor screens. */
export const MONITOR_CANVAS = {
  width: 128,
  height: 96,
  backgroundColor: '#0d1117',
} as const;

/** Desk lamp dimensions. */
export const LAMP = {
  baseRadius: 0.04,
  baseHeight: 0.01,
  poleRadius: 0.015,
  poleHeight: 0.25,
  shadeRadiusTop: 0.02,
  shadeRadiusBottom: 0.06,
  shadeHeight: 0.04,
  baseColor: '#333333',
  poleColor: '#444444',
  /** Y position: desk surface + base + pole + partial shade */
  positionY: 0.74,
  /** X offset from desk center */
  positionX: 0.5,
  /** Z offset from desk center */
  positionZ: 0.2,
} as const;

/** Status colors for desk lamp emissive (hex). */
export const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  idle: '#3b82f6',
  waiting: '#f59e0b',
  error: '#ef4444',
} as const;

/** Wall partition dimensions. */
export const PARTITION = {
  color: '#c8d0d8',
  opacity: 1.0,
} as const;

/** Code color palettes for monitor animation, keyed by activity. */
export const CODE_PALETTES: Record<string, string[]> = {
  typing: ['#66dd88', '#88aaff', '#aaddaa', '#dd8844'],
  reading: ['#88aaff', '#66ccff', '#aaccff', '#ff8866'],
  chatting: ['#ffaa44', '#ffcc66', '#ffffff', '#88ccff'],
  waiting: ['#ffcc44', '#ff8844', '#ffaa00', '#ffffff'],
  idle: ['#334455', '#445566', '#556677'],
} as const;
