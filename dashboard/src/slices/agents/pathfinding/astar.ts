import type { Position2D } from '@/types/office';

/** Euclidean distance between two 2D floor-plane positions. */
export function euclidean(a: Position2D, b: Position2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * A* search over a string-keyed adjacency map.
 *
 * Returns an ordered array of waypoint keys from `start` to `goal`,
 * or an empty array if no path exists.
 */
export function astar(
  adjacency: Record<string, string[]>,
  positions: Record<string, Position2D>,
  start: string,
  goal: string,
): string[] {
  if (start === goal) return [start];

  const open = new Set<string>([start]);
  const closed = new Set<string>();
  const gScore: Record<string, number> = { [start]: 0 };
  const fScore: Record<string, number> = {
    [start]: euclidean(positions[start], positions[goal]),
  };
  const cameFrom: Record<string, string> = {};

  while (open.size > 0) {
    const current = pickLowestF(open, fScore);
    if (current === goal) {
      return reconstructPath(cameFrom, current);
    }

    open.delete(current);
    closed.add(current);

    for (const neighbor of adjacency[current] ?? []) {
      if (closed.has(neighbor)) continue;

      const tentativeG =
        (gScore[current] ?? Infinity) +
        euclidean(positions[current], positions[neighbor]);

      if (tentativeG < (gScore[neighbor] ?? Infinity)) {
        cameFrom[neighbor] = current;
        gScore[neighbor] = tentativeG;
        fScore[neighbor] =
          tentativeG + euclidean(positions[neighbor], positions[goal]);
        open.add(neighbor);
      }
    }
  }

  return [];
}

/** Pick the node with the lowest f-score from the open set. */
function pickLowestF(
  open: Set<string>,
  fScore: Record<string, number>,
): string {
  let best = '';
  let bestF = Infinity;
  for (const node of open) {
    const f = fScore[node] ?? Infinity;
    if (f < bestF) {
      bestF = f;
      best = node;
    }
  }
  return best;
}

/** Reconstruct path by walking cameFrom links back to the start. */
function reconstructPath(
  cameFrom: Record<string, string>,
  current: string,
): string[] {
  const path: string[] = [current];
  let node = current;
  while (cameFrom[node] !== undefined) {
    node = cameFrom[node];
    path.unshift(node);
  }
  return path;
}
