/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import {
  processWASD,
  shouldIgnoreInput,
  WASD_SPEED,
  SHIFT_MULTIPLIER,
  VERTICAL_SPEED_FACTOR,
  MIN_Y,
  MAX_Y,
} from './useWASDCamera';

describe('constants', () => {
  it('should define WASD_SPEED as 12', () => {
    expect(WASD_SPEED).toBe(12);
  });

  it('should define SHIFT_MULTIPLIER as 2.2', () => {
    expect(SHIFT_MULTIPLIER).toBeCloseTo(2.2);
  });

  it('should define vertical speed factor as 0.5', () => {
    expect(VERTICAL_SPEED_FACTOR).toBeCloseTo(0.5);
  });

  it('should define Y bounds (4 to 40)', () => {
    expect(MIN_Y).toBe(4);
    expect(MAX_Y).toBe(40);
  });
});

describe('shouldIgnoreInput', () => {
  it('should return true for INPUT elements', () => {
    const el = document.createElement('input');
    expect(shouldIgnoreInput(el)).toBe(true);
  });

  it('should return true for TEXTAREA elements', () => {
    const el = document.createElement('textarea');
    expect(shouldIgnoreInput(el)).toBe(true);
  });

  it('should return true for contentEditable elements', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'true');
    expect(shouldIgnoreInput(el)).toBe(true);
  });

  it('should return false for regular div elements', () => {
    const el = document.createElement('div');
    expect(shouldIgnoreInput(el)).toBe(false);
  });

  it('should return false for null', () => {
    expect(shouldIgnoreInput(null)).toBe(false);
  });
});

describe('processWASD', () => {
  function createMockCamera() {
    return {
      position: { x: 0, y: 10, z: 0, add: vi.fn() },
      getWorldDirection: vi.fn((v: { x: number; y: number; z: number; normalize: () => void }) => {
        v.x = 0; v.y = 0; v.z = -1;
        v.normalize = () => {};
        return v;
      }),
      up: { x: 0, y: 1, z: 0 },
    };
  }

  function createMockControls() {
    return {
      target: { x: 0, y: 0, z: 0, add: vi.fn() },
    };
  }

  it('should not move when no keys are pressed', () => {
    const camera = createMockCamera();
    const controls = createMockControls();
    const keysDown = new Set<string>();
    processWASD(keysDown, camera as any, controls as any, 0.016);
    expect(camera.position.add).not.toHaveBeenCalled();
  });

  it('should move forward when W is pressed', () => {
    const camera = createMockCamera();
    const controls = createMockControls();
    const keysDown = new Set(['w']);
    processWASD(keysDown, camera as any, controls as any, 1.0);
    expect(camera.position.add).toHaveBeenCalled();
    expect(controls.target.add).toHaveBeenCalled();
  });

  it('should apply SHIFT_MULTIPLIER when shift is held', () => {
    const camera = createMockCamera();
    const controls = createMockControls();
    const keysDown = new Set(['w', 'shift']);
    processWASD(keysDown, camera as any, controls as any, 1.0);
    const moveVec = camera.position.add.mock.calls[0][0];
    const mag = Math.sqrt(moveVec.x ** 2 + moveVec.z ** 2);
    expect(mag).toBeCloseTo(26.4, 0);
  });

  it('should raise camera on E press', () => {
    const camera = createMockCamera();
    const controls = createMockControls();
    const keysDown = new Set(['e']);
    processWASD(keysDown, camera as any, controls as any, 1.0);
    expect(camera.position.y).toBeLessThanOrEqual(MAX_Y);
  });

  it('should lower camera on Q press', () => {
    const camera = createMockCamera();
    camera.position.y = 20;
    const controls = createMockControls();
    const keysDown = new Set(['q']);
    processWASD(keysDown, camera as any, controls as any, 1.0);
    expect(camera.position.y).toBeGreaterThanOrEqual(MIN_Y);
  });

  it('should clamp Y to MIN_Y', () => {
    const camera = createMockCamera();
    camera.position.y = 5;
    const controls = createMockControls();
    const keysDown = new Set(['q']);
    processWASD(keysDown, camera as any, controls as any, 10.0);
    expect(camera.position.y).toBeGreaterThanOrEqual(MIN_Y);
  });

  it('should clamp Y to MAX_Y', () => {
    const camera = createMockCamera();
    camera.position.y = 39;
    const controls = createMockControls();
    const keysDown = new Set(['e']);
    processWASD(keysDown, camera as any, controls as any, 10.0);
    expect(camera.position.y).toBeLessThanOrEqual(MAX_Y);
  });

  it('should move both camera and controls.target together', () => {
    const camera = createMockCamera();
    const controls = createMockControls();
    const keysDown = new Set(['d']);
    processWASD(keysDown, camera as any, controls as any, 1.0);
    expect(camera.position.add).toHaveBeenCalledOnce();
    expect(controls.target.add).toHaveBeenCalledOnce();
    const camVec = camera.position.add.mock.calls[0][0];
    const ctrlVec = controls.target.add.mock.calls[0][0];
    expect(camVec).toBe(ctrlVec);
  });
});
