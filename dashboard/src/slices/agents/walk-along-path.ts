import type { Position2D } from '@/types/office';

export interface PathWalkerConfig {
  walkSpeed: number;
  arrivalThreshold: number;
}

export interface TickResult {
  position: Position2D;
  rotationY: number;
}

export interface PathWalker {
  readonly isWalking: boolean;
  readonly pathIndex: number;
  onArrive: (() => void) | null;
  setPath(path: Position2D[]): void;
  setPosition(pos: Position2D): void;
  tick(delta: number): TickResult;
}

/**
 * Compute the facing angle toward a target on the xz plane.
 * Returns atan2(dx, dz) so 0 = facing +z, PI/2 = facing +x.
 */
export function computeFacingAngle(from: Position2D, to: Position2D): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return Math.atan2(dx, dz);
}

/**
 * Euclidean distance between two xz positions.
 */
function distance(a: Position2D, b: Position2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Filter out leading waypoints that the walker has already passed or
 * that are within tolerance of the current position.
 *
 * A waypoint is considered "passed" when the walker is closer to the
 * next waypoint in the sequence than to the current one.
 */
function filterPassedWaypoints(
  path: Position2D[],
  currentPos: Position2D,
  tolerance: number,
): Position2D[] {
  let startIdx = 0;
  while (startIdx < path.length) {
    const distToThis = distance(currentPos, path[startIdx]);
    if (distToThis < tolerance) {
      startIdx++;
      continue;
    }
    const next = path[startIdx + 1];
    if (next && distToThis >= distance(currentPos, next)) {
      startIdx++;
      continue;
    }
    break;
  }
  return path.slice(startIdx);
}

/**
 * Creates a framework-agnostic path walker that interpolates position
 * along a sequence of waypoints at a fixed walk speed.
 *
 * REQ-049: Path-following via refs at walk speed.
 * REQ-051: Handle path interruption from current position.
 */
export function createPathWalker(config: PathWalkerConfig): PathWalker {
  let currentPos: Position2D = { x: 0, z: 0 };
  let path: Position2D[] = [];
  let pathIdx = 0;
  let walking = false;
  let lastRotationY = 0;

  const walker: PathWalker = {
    get isWalking() {
      return walking;
    },

    get pathIndex() {
      return pathIdx;
    },

    onArrive: null,

    setPath(newPath: Position2D[]): void {
      const filtered = filterPassedWaypoints(newPath, currentPos, 0.1);
      path = filtered;
      pathIdx = 0;
      walking = filtered.length > 0;
    },

    setPosition(pos: Position2D): void {
      currentPos = { x: pos.x, z: pos.z };
    },

    tick(delta: number): TickResult {
      if (delta <= 0 || !walking || path.length === 0) {
        return { position: { ...currentPos }, rotationY: lastRotationY };
      }

      const target = path[pathIdx];
      const dist = distance(currentPos, target);
      const step = Math.min(config.walkSpeed * delta, dist);

      lastRotationY = computeFacingAngle(currentPos, target);

      if (dist > 0) {
        const ratio = step / dist;
        currentPos = {
          x: currentPos.x + (target.x - currentPos.x) * ratio,
          z: currentPos.z + (target.z - currentPos.z) * ratio,
        };
      }

      if (distance(currentPos, target) < config.arrivalThreshold) {
        advanceToNextWaypoint();
      }

      return { position: { ...currentPos }, rotationY: lastRotationY };
    },
  };

  function advanceToNextWaypoint(): void {
    pathIdx++;
    if (pathIdx >= path.length) {
      walking = false;
      pathIdx = path.length - 1;
      walker.onArrive?.();
    }
  }

  return walker;
}
