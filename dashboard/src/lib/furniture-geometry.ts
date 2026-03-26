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

/** Office chair dimensions. */
export const CHAIR = {
  seatWidth: 0.45,
  seatDepth: 0.42,
  seatHeight: 0.46,
  seatThickness: 0.04,
  backHeight: 0.4,
  backThickness: 0.03,
  baseRadius: 0.28,
  cylinderRadius: 0.025,
  cylinderHeight: 0.14,
  armHeight: 0.22,
  armWidth: 0.04,
  armDepth: 0.25,
  armThickness: 0.03,
  seatColor: '#2a2a2a',
  baseColor: '#333333',
  armColor: '#2a2a2a',
  /** Z offset from workstation origin to place chair behind desk. */
  offsetZ: 0.65,
} as const;

// ─── Server Room ────────────────────────────────────────────────

/** Server rack dimensions. */
export const SERVER_RACK = {
  width: 0.6,
  height: 2.0,
  depth: 0.5,
  shelfCount: 5,
  shelfSpacing: 0.32,
  shelfStartY: 0.4,
  color: '#2a2a2a',
  panelColor: '#1a1a1a',
  shelfColor: '#333333',
  ledColor: '#00ff44',
  ledRadius: 0.02,
  activityLedColor: '#00aaff',
  activityLedRadius: 0.015,
} as const;

/** Traffic light indicator dimensions. */
export const TRAFFIC_LIGHT = {
  width: 0.15,
  height: 0.5,
  depth: 0.08,
  lightRadius: 0.035,
  color: '#333333',
  redColor: '#ff0000',
  amberColor: '#ffaa00',
  greenColor: '#00ff00',
} as const;

// ─── War Room ───────────────────────────────────────────────────

/** Multi-screen wall display dimensions. */
export const SCREEN_WALL = {
  width: 14,
  height: 2.0,
  depth: 0.08,
  screenCount: 6,
  screenHeight: 0.8,
  screenMargin: 0.2,
  color: '#1a1a2e',
  screenCasingColor: '#222222',
  screenColor: '#001122',
  screenEmissive: '#003344',
} as const;

// ─── Security Desk ──────────────────────────────────────────────

/** Barrier gate dimensions. */
export const BARRIER_GATE = {
  postRadius: 0.05,
  postHeight: 1.0,
  armWidth: 1.6,
  armHeight: 0.06,
  armDepth: 0.06,
  color: '#444444',
  armColor: '#cc0000',
  ledColor: '#ff0000',
  ledRadius: 0.04,
} as const;

// ─── Conference Room ────────────────────────────────────────────

/** Conference table dimensions. */
export const CONFERENCE_TABLE = {
  length: 4,
  width: 1.4,
  height: 0.06,
  surfaceY: 0.74,
  legRadius: 0.06,
  legHeight: 0.72,
  color: '#5c3d1a',
  legColor: '#555555',
} as const;

/** Conference chair dimensions. */
export const CONFERENCE_CHAIR = {
  seatWidth: 0.35,
  seatDepth: 0.35,
  seatHeight: 0.05,
  seatY: 0.44,
  backWidth: 0.35,
  backHeight: 0.35,
  backDepth: 0.03,
  backY: 0.64,
  stemRadius: 0.03,
  stemHeight: 0.42,
  color: '#2a2a4a',
  stemColor: '#666666',
} as const;

/** Whiteboard dimensions. */
export const WHITEBOARD = {
  width: 2.5,
  height: 1.4,
  frameDepth: 0.04,
  surfaceDepth: 0.01,
  trayHeight: 0.06,
  trayDepth: 0.08,
  color: '#444444',
  surfaceColor: '#eeeeee',
  trayColor: '#555555',
} as const;

// ─── Archives / Vault ───────────────────────────────────────────

/** Bookshelf dimensions. */
export const BOOKSHELF = {
  width: 1.2,
  height: 2.0,
  depth: 0.3,
  sideThickness: 0.04,
  shelfThickness: 0.02,
  shelfCount: 4,
  color: '#654321',
} as const;

/** Filing cabinet dimensions. */
export const FILING_CABINET = {
  width: 0.5,
  height: 1.3,
  depth: 0.45,
  drawerCount: 3,
  drawerSpacing: 0.4,
  drawerStartY: 0.3,
  color: '#555555',
  drawerLineColor: '#333333',
  handleColor: '#888888',
} as const;

// ─── Tool Workshop ──────────────────────────────────────────────

/** Tool bench dimensions (desk-based with status screen). */
export const TOOL_BENCH = {
  width: 1.2,
  depth: 0.5,
  screenWidth: 0.3,
  screenHeight: 0.3,
  screenDepth: 0.02,
  indicatorWidth: 0.26,
  indicatorHeight: 0.26,
  color: '#5a5a5a',
  screenColor: '#222222',
  accentColors: {
    filesystem: '#3b82f6',
    shell: '#10b981',
    web: '#f59e0b',
    mcp: '#8b5cf6',
    generic: '#6b7280',
  },
} as const;

// ─── Mailroom / Comms Hub ───────────────────────────────────────

/** Mail station dimensions. */
export const MAIL_STATION = {
  deskWidth: 1.0,
  deskDepth: 0.5,
  platformWidth: 0.3,
  platformHeight: 0.08,
  platformDepth: 0.2,
  trayWidth: 0.25,
  trayHeight: 0.15,
  trayDepth: 0.15,
  color: '#6b6b6b',
  platformColors: {
    discord: '#5865f2',
    slack: '#4a154b',
    telegram: '#0088cc',
  },
} as const;

// ─── Break Room ─────────────────────────────────────────────────

/** Kitchen counter dimensions. */
export const KITCHEN_COUNTER = {
  width: 2.0,
  height: 0.05,
  depth: 0.6,
  surfaceY: 0.9,
  cabinetWidth: 2.0,
  cabinetHeight: 0.88,
  cabinetDepth: 0.55,
  color: '#999999',
  cabinetColor: '#444444',
} as const;

/** Ping pong table dimensions. */
export const PING_PONG_TABLE = {
  width: 1.6,
  height: 0.04,
  depth: 0.9,
  surfaceY: 0.76,
  netWidth: 0.02,
  netHeight: 0.12,
  legInset: 0.1,
  legHeight: 0.74,
  color: '#1a6b3c',
  netColor: '#ffffff',
  legColor: '#666666',
} as const;

/** Idea board dimensions. */
export const IDEA_BOARD = {
  width: 1.5,
  height: 1.0,
  depth: 0.04,
  noteSize: 0.12,
  noteCount: 6,
  color: '#7b6b4e',
  noteColors: ['#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#e91e63'],
} as const;

// ─── Escalation Zone ────────────────────────────────────────────

/** Alarm bell dimensions. */
export const ALARM_BELL = {
  backplateWidth: 0.2,
  backplateHeight: 0.2,
  backplateDepth: 0.08,
  bellRadiusTop: 0.08,
  bellRadiusBottom: 0.06,
  bellHeight: 0.06,
  ledRadius: 0.015,
  color: '#333333',
  bellColor: '#cc0000',
  ledColor: '#ff0000',
} as const;

// ─── Decorations ──────────────────────────────────────────────

/** Floor plant dimensions. */
export const PLANT = {
  trunkRadius: 0.06,
  trunkHeight: 0.4,
  canopyRadius: 0.25,
  trunkColor: '#6b4226',
  canopyColor: '#2d6a1e',
} as const;

/** Trash bin dimensions. */
export const TRASH_BIN = {
  radiusTop: 0.18,
  radiusBottom: 0.15,
  height: 0.45,
  color: '#555555',
} as const;

/** Water cooler dimensions. */
export const WATER_COOLER = {
  width: 0.3,
  height: 0.9,
  depth: 0.3,
  color: '#b8d4e3',
} as const;

/** Photocopier dimensions. */
export const PHOTOCOPIER = {
  width: 0.8,
  height: 0.7,
  depth: 0.6,
  color: '#3a3a3a',
} as const;

/** Printer dimensions. */
export const PRINTER_DIM = {
  width: 0.5,
  height: 0.35,
  depth: 0.4,
  color: '#2a2a2a',
} as const;

/** Desk clutter item dimensions. */
export const CLUTTER = {
  keyboard: { width: 0.35, height: 0.02, depth: 0.12, color: '#222222' },
  coffeeCup: { radius: 0.03, height: 0.08, color: '#d4a574' },
  paperStack: { width: 0.2, height: 0.04, depth: 0.28, color: '#f0ece0' },
  /** Y offset above desk surface for clutter items. */
  surfaceOffset: 0.02,
} as const;

// ─── Existing Constants ─────────────────────────────────────────

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

/** Glass material props for windows and glass partitions. */
export const GLASS_MATERIAL = {
  transmission: 0.85,
  roughness: 0.1,
  thickness: 0.1,
  color: '#aaddff',
  transparent: true,
  opacity: 0.3,
} as const;

/** Code color palettes for monitor animation, keyed by activity. */
export const CODE_PALETTES: Record<string, string[]> = {
  typing: ['#66dd88', '#88aaff', '#aaddaa', '#dd8844'],
  reading: ['#88aaff', '#66ccff', '#aaccff', '#ff8866'],
  chatting: ['#ffaa44', '#ffcc66', '#ffffff', '#88ccff'],
  waiting: ['#ffcc44', '#ff8844', '#ffaa00', '#ffffff'],
  idle: ['#334455', '#445566', '#556677'],
} as const;
