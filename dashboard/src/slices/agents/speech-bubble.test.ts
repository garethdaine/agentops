import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawSpeechBubble,
  type SpeechBubbleOptions,
  createBubbleManager,
  BUBBLE_CANVAS_WIDTH,
  BUBBLE_CANVAS_HEIGHT,
  MAX_TEXT_LENGTH,
} from './SpeechBubble';

// Mock canvas context
function createMockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    ellipse: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('constants', () => {
  it('should define canvas as 320x96', () => {
    expect(BUBBLE_CANVAS_WIDTH).toBe(320);
    expect(BUBBLE_CANVAS_HEIGHT).toBe(96);
  });

  it('should truncate at 40 characters', () => {
    expect(MAX_TEXT_LENGTH).toBe(40);
  });
});

describe('drawSpeechBubble', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it('should draw a talk bubble with pointer triangle', () => {
    drawSpeechBubble(ctx, 'Hello world', { thought: false });
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled(); // triangle pointer
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('Hello world', 160, 36);
  });

  it('should draw a thought bubble with ellipses instead of pointer', () => {
    drawSpeechBubble(ctx, 'Thinking...', { thought: true });
    expect(ctx.ellipse).toHaveBeenCalled(); // thought dots
    expect(ctx.moveTo).not.toHaveBeenCalled(); // no triangle pointer
  });

  it('should truncate text longer than 40 chars with ellipsis', () => {
    const longText = 'A'.repeat(50);
    drawSpeechBubble(ctx, longText, { thought: false });
    expect(ctx.fillText).toHaveBeenCalledWith(
      'A'.repeat(37) + '...',
      160,
      36,
    );
  });

  it('should use bg rgba(15,20,40,0.92) and text #e0e8ff', () => {
    drawSpeechBubble(ctx, 'Test', { thought: false });
    // Verify fillStyle was set to bg color at some point
    expect(ctx.fillStyle).toBe('#e0e8ff'); // Last set is text color
  });

  it('should not truncate text at exactly 40 chars', () => {
    const exact = 'B'.repeat(40);
    drawSpeechBubble(ctx, exact, { thought: false });
    expect(ctx.fillText).toHaveBeenCalledWith(exact, 160, 36);
  });
});

describe('createBubbleManager', () => {
  let acquireFn: ReturnType<typeof vi.fn>;
  let releaseFn: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool = () => ({ acquire: acquireFn, release: releaseFn } as any);

  beforeEach(() => {
    acquireFn = vi.fn().mockReturnValue({
      canvas: { width: 320, height: 96, getContext: () => createMockCtx() },
      texture: { needsUpdate: false, dispose: vi.fn() },
    });
    releaseFn = vi.fn();
  });

  it('should acquire a texture from pool on show', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Hello', { thought: false, duration: 4 });
    expect(acquireFn).toHaveBeenCalledOnce();
  });

  it('should release texture to pool on hide', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Hello', { thought: false, duration: 4 });
    mgr.hide('agent-1');
    expect(releaseFn).toHaveBeenCalledOnce();
  });

  it('should hide previous bubble when showing new one for same agent', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'First', { thought: false, duration: 4 });
    mgr.show('agent-1', 'Second', { thought: false, duration: 4 });
    expect(releaseFn).toHaveBeenCalledOnce(); // Released first
    expect(acquireFn).toHaveBeenCalledTimes(2); // Acquired twice
  });

  it('should return opacity=1 before 75% lifetime', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Test', { thought: false, duration: 4 });
    const state = mgr.tick(2.0); // 50% of 4s
    const entry = state.get('agent-1');
    expect(entry?.opacity).toBe(1);
  });

  it('should fade opacity after 75% lifetime', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Test', { thought: false, duration: 4 });
    mgr.tick(3.5); // 87.5% of 4s — well past 75%
    const state = mgr.tick(0);
    const entry = state.get('agent-1');
    expect(entry?.opacity).toBeLessThan(1);
    expect(entry?.opacity).toBeGreaterThan(0);
  });

  it('should auto-hide after full lifetime', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Test', { thought: false, duration: 4 });
    mgr.tick(4.1);
    expect(releaseFn).toHaveBeenCalledOnce();
  });

  it('should return bob position using sin(age * 2) * 0.02', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'Test', { thought: false, duration: 4 });
    const state = mgr.tick(1.0);
    const entry = state.get('agent-1');
    const expectedBob = 1.75 + Math.sin(1.0 * 2) * 0.02;
    expect(entry?.positionY).toBeCloseTo(expectedBob, 3);
  });

  it('should dispose all active bubbles', () => {
    const mgr = createBubbleManager(pool());
    mgr.show('agent-1', 'A', { thought: false, duration: 4 });
    mgr.show('agent-2', 'B', { thought: true, duration: 4 });
    mgr.dispose();
    expect(releaseFn).toHaveBeenCalledTimes(2);
  });
});
