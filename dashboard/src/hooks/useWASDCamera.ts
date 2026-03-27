import { Vector3 } from 'three';

export const WASD_SPEED = 12;
const UP = new Vector3(0, 1, 0);
export const SHIFT_MULTIPLIER = 2.2;
export const VERTICAL_SPEED_FACTOR = 0.5;
export const MIN_Y = 4;
export const MAX_Y = 40;

const IGNORED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function shouldIgnoreInput(element: Element | null): boolean {
  if (!element) return false;
  if (IGNORED_TAGS.has(element.tagName)) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  if (element.getAttribute?.('contenteditable') === 'true') return true;
  return false;
}

interface CameraLike {
  position: Vector3;
  getWorldDirection(target: Vector3): Vector3;
}

interface ControlsLike {
  target: Vector3;
}

// Cached vectors to avoid per-frame allocation
const _forward = new Vector3();
const _right = new Vector3();
const _move = new Vector3();

export function processWASD(
  keysDown: Set<string>,
  camera: CameraLike,
  controls: ControlsLike,
  delta: number,
): void {
  if (keysDown.size === 0) return;

  const hasMovement = keysDown.has('w') || keysDown.has('a') || keysDown.has('s') || keysDown.has('d');
  const hasVertical = keysDown.has('q') || keysDown.has('e');

  if (!hasMovement && !hasVertical) return;

  const speed = WASD_SPEED * (keysDown.has('shift') ? SHIFT_MULTIPLIER : 1) * delta;

  // Handle vertical movement (Q/E)
  if (hasVertical) {
    const vertSpeed = speed * VERTICAL_SPEED_FACTOR;
    if (keysDown.has('e')) camera.position.y += vertSpeed;
    if (keysDown.has('q')) camera.position.y -= vertSpeed;
    camera.position.y = Math.max(MIN_Y, Math.min(MAX_Y, camera.position.y));
  }

  // Handle horizontal movement (WASD)
  if (hasMovement) {
    camera.getWorldDirection(_forward);
    // Project to XZ plane
    _forward.y = 0;
    const len = Math.sqrt(_forward.x * _forward.x + _forward.z * _forward.z);
    if (len > 0.001) {
      _forward.x /= len;
      _forward.z /= len;
    }

    // Right vector = cross(up, forward) = (fz, 0, -fx)
    const rightX = _forward.z;
    const rightZ = -_forward.x;

    _move.x = 0;
    _move.y = 0;
    _move.z = 0;

    if (keysDown.has('w')) { _move.x += _forward.x; _move.z += _forward.z; }
    if (keysDown.has('s')) { _move.x -= _forward.x; _move.z -= _forward.z; }
    if (keysDown.has('d')) { _move.x += rightX; _move.z += rightZ; }
    if (keysDown.has('a')) { _move.x -= rightX; _move.z -= rightZ; }

    // Normalize diagonal movement
    const moveLen = Math.sqrt(_move.x * _move.x + _move.z * _move.z);
    if (moveLen > 0.001) {
      _move.x = (_move.x / moveLen) * speed;
      _move.z = (_move.z / moveLen) * speed;
    }

    // Move both camera and target together
    camera.position.add(_move);
    controls.target.add(_move);
  }
}
