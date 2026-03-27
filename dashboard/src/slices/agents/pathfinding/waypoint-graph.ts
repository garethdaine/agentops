import type { Position2D } from '@/types/office';
import { astar, euclidean } from './astar';

/**
 * 56 named waypoints covering corridors, aisles, gaps, doorways,
 * and zone entry points. Coordinates are on the xz floor plane.
 */
export const WAYPOINTS: Record<string, Position2D> = {
  // Main corridor (z=-2.5)
  mcW:  { x: -7,   z: -2.5 },
  mc6:  { x: -6,   z: -2.5 },
  mc3:  { x: -3,   z: -2.5 },
  mcC:  { x: 0,    z: -2.5 },
  mc3E: { x: 3,    z: -2.5 },
  mc6E: { x: 6,    z: -2.5 },

  // Corridor gaps between desk columns
  cg63: { x: -4.5, z: -2.5 },
  cg30: { x: -1.5, z: -2.5 },
  cg03: { x: 1.5,  z: -2.5 },
  cg36: { x: 4.5,  z: -2.5 },
  cg6w: { x: 7.5,  z: -2.5 },

  // North aisle (z=-5.5)
  nWW: { x: -10, z: -5.5 },
  nW:  { x: -7,  z: -5.5 },
  nC:  { x: 0,   z: -5.5 },
  nE:  { x: 6,   z: -5.5 },
  nEE: { x: 10,  z: -5.5 },

  // South aisle (z=0.5)
  sW:  { x: -7, z: 0.5 },
  s6:  { x: -6, z: 0.5 },
  s3:  { x: -3, z: 0.5 },
  sC:  { x: 0,  z: 0.5 },
  s3E: { x: 3,  z: 0.5 },
  s6E: { x: 6,  z: 0.5 },

  // South aisle gaps
  sg63: { x: -4.5, z: 0.5 },
  sg30: { x: -1.5, z: 0.5 },
  sg03: { x: 1.5,  z: 0.5 },
  sg36: { x: 4.5,  z: 0.5 },
  sg6w: { x: 7.5,  z: 0.5 },

  // Open south area
  southW: { x: -5, z: 3 },
  southC: { x: 0,  z: 3 },
  southE: { x: 5,  z: 3 },

  // Doorways
  doorA: { x: -8,    z: -6.5 },
  doorB: { x: -8,    z: 0 },
  doorC: { x: 10.5,  z: -6.5 },
  doorD: { x: 6.5,   z: 2 },
  doorE: { x: 6.5,   z: 8.5 },

  // West corridor
  westN: { x: -10, z: -6.5 },
  westC: { x: -10, z: 0 },
  westS: { x: -10, z: 5.5 },

  // East corridor
  eastN: { x: 8, z: 3 },
  eastC: { x: 8, z: 6 },
  eastS: { x: 8, z: 8.5 },

  // Conference approach
  confApproach: { x: -2, z: 5.5 },
  confWest:     { x: -5, z: 5.5 },
  confEast:     { x: 2,  z: 5.5 },
  confBehind:   { x: -5, z: 8.5 },

  // Tool workshop approach
  toolApproach: { x: -10, z: 6 },

  // Room interiors
  serverRoom:   { x: -10.5, z: -8.5 },
  warRoomW:     { x: -2,    z: -8.5 },
  warRoomE:     { x: 8,     z: -8.5 },
  securityDesk: { x: -11,   z: -3.5 },
  mailroom:     { x: -11,   z: 3 },
  conference:   { x: -2,    z: 8.5 },
  vault:        { x: 9,     z: 6 },
  toolWorkshop: { x: -10,   z: 8.5 },
  breakRoom:    { x: 9,     z: 9.5 },
  escalation:   { x: -8,    z: 1 },
};

/** Edge pairs defining walkable connections between waypoints. */
const EDGES: [string, string][] = [
  // Main corridor (z=-2.5) east-west
  ['mcW', 'mc6'],
  ['mc6', 'cg63'],
  ['cg63', 'mc3'],
  ['mc3', 'cg30'],
  ['cg30', 'mcC'],
  ['mcC', 'cg03'],
  ['cg03', 'mc3E'],
  ['mc3E', 'cg36'],
  ['cg36', 'mc6E'],
  ['mc6E', 'cg6w'],

  // North aisle (z=-5.5) east-west
  ['nWW', 'nW'],
  ['nW', 'nC'],
  ['nC', 'nE'],
  ['nE', 'nEE'],

  // South aisle (z=0.5) east-west
  ['sW', 's6'],
  ['s6', 'sg63'],
  ['sg63', 's3'],
  ['s3', 'sg30'],
  ['sg30', 'sC'],
  ['sC', 'sg03'],
  ['sg03', 's3E'],
  ['s3E', 'sg36'],
  ['sg36', 's6E'],
  ['s6E', 'sg6w'],

  // N-S links at wall edges
  ['nW', 'mcW'],
  ['nC', 'mcC'],
  ['nE', 'mc6E'],
  ['mcW', 'sW'],

  // N-S links through gaps
  ['cg63', 'sg63'],
  ['cg30', 'sg30'],
  ['cg03', 'sg03'],
  ['cg36', 'sg36'],
  ['cg6w', 'sg6w'],

  // South aisle to open south area
  ['sW', 'southW'],
  ['sC', 'southC'],
  ['sg6w', 'southE'],
  ['southW', 'southC'],
  ['southC', 'southE'],

  // Door A: x=-8 wall, gap z=-7 to z=-6
  ['nWW', 'doorA'],
  ['doorA', 'westN'],

  // Door B: x=-8 wall, gap z=-1 to z=1
  ['sW', 'doorB'],
  ['doorB', 'westC'],

  // Door C: z=-6.5 wall, gap x>10
  ['nEE', 'doorC'],
  ['doorC', 'warRoomE'],

  // Door D: x=6.5 wall, gap below z=2.5
  ['southE', 'doorD'],
  ['doorD', 'eastN'],

  // Door E: x=6.5 wall, gap above z=8
  ['doorE', 'eastS'],

  // West corridor
  ['westN', 'westC'],
  ['westC', 'westS'],
  ['westN', 'serverRoom'],
  ['westC', 'securityDesk'],
  ['westC', 'mailroom'],
  ['westS', 'toolApproach'],
  ['toolApproach', 'toolWorkshop'],

  // East corridor
  ['eastN', 'eastC'],
  ['eastC', 'eastS'],
  ['eastC', 'vault'],
  ['eastS', 'breakRoom'],

  // War room
  ['warRoomW', 'warRoomE'],
  ['doorB', 'escalation'],

  // War room west access via north aisle
  ['nWW', 'warRoomW'],

  // Conference (route west around the table)
  ['southW', 'confApproach'],
  ['southC', 'confApproach'],
  ['confApproach', 'confWest'],
  ['confApproach', 'confEast'],
  ['confEast', 'southE'],
  ['confWest', 'confBehind'],
  ['confBehind', 'conference'],

  // Connect east door E to south area
  ['southE', 'doorE'],
];

let _adjacencyCache: Record<string, string[]> | null = null;

/**
 * Build (and cache) a bidirectional adjacency map from EDGES.
 * Returns a map of waypoint key to array of neighbor keys.
 */
export function buildAdjacency(): Record<string, string[]> {
  if (_adjacencyCache) return _adjacencyCache;

  const adj: Record<string, string[]> = {};
  for (const key of Object.keys(WAYPOINTS)) {
    adj[key] = [];
  }
  for (const [a, b] of EDGES) {
    if (adj[a] && adj[b]) {
      adj[a].push(b);
      adj[b].push(a);
    }
  }
  _adjacencyCache = adj;
  return adj;
}

/**
 * Find the closest waypoint key to a given floor-plane position.
 * Returns null only if WAYPOINTS is empty.
 */
export function nearestWaypoint(pos: Position2D): string | null {
  let best: string | null = null;
  let bestDist = Infinity;

  for (const [key, wp] of Object.entries(WAYPOINTS)) {
    const d = euclidean(pos, wp);
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
}

/** Zone-ID to waypoint-key mapping for entry points. */
const ZONE_ENTRY_MAP: Record<string, string> = {
  serverRack:   'serverRoom',
  warRoom:      'warRoomW',
  securityDesk: 'securityDesk',
  workstations: 'mcC',
  mailroom:     'mailroom',
  conference:   'conference',
  vault:        'vault',
  toolWorkshop: 'toolWorkshop',
  breakRoom:    'breakRoom',
  escalation:   'escalation',
};

/**
 * Resolve a zone ID to its entry waypoint position.
 * Falls back to the workstations center (mcC) for unknown zones.
 */
export function getZoneEntryPoint(zoneId: string): Position2D {
  const wpKey = ZONE_ENTRY_MAP[zoneId] ?? 'mcC';
  return WAYPOINTS[wpKey];
}

/**
 * Find a walkable path between two floor-plane positions.
 *
 * Snaps both positions to the nearest waypoints, runs A* search,
 * and returns an array of Position2D coordinates. The final exact
 * destination is appended for smooth arrival.
 */
export function findPath(
  fromPos: Position2D,
  toPos: Position2D,
): Position2D[] {
  const startWP = nearestWaypoint(fromPos);
  const endWP = nearestWaypoint(toPos);

  if (!startWP || !endWP) return [toPos];
  if (startWP === endWP) return [toPos];

  const adj = buildAdjacency();
  const keys = astar(adj, WAYPOINTS, startWP, endWP);

  if (keys.length === 0) return [toPos];

  const path = keys.map((k) => WAYPOINTS[k]);
  path.push(toPos);
  return path;
}
