/**
 * Speech bubble component for agent avatars (REQ-056 through REQ-061).
 *
 * Provides:
 * - drawSpeechBubble: pure canvas-drawing function (talk/thought variants)
 * - createBubbleManager: lifecycle manager using texture pool acquire/release
 * - Constants: BUBBLE_CANVAS_WIDTH, BUBBLE_CANVAS_HEIGHT, MAX_TEXT_LENGTH
 */

import type { PoolEntry } from '@/lib/canvas-texture-pool';

// ── Constants ──────────────────────────────────────────────────────────

export const BUBBLE_CANVAS_WIDTH = 320;
export const BUBBLE_CANVAS_HEIGHT = 96;
export const MAX_TEXT_LENGTH = 40;

const BUBBLE_BG_COLOR = 'rgba(15,20,40,0.92)';
const BUBBLE_TEXT_COLOR = '#e0e8ff';
const BUBBLE_BORDER_COLOR = 'rgba(100,120,180,0.5)';
const BUBBLE_FONT = 'bold 15px sans-serif';
const BUBBLE_RADIUS = 12;
const BUBBLE_PADDING_X = 12;
const BUBBLE_PADDING_Y = 8;
const BUBBLE_BODY_HEIGHT = 60;

const TEXT_CENTER_X = BUBBLE_CANVAS_WIDTH / 2;
const TEXT_CENTER_Y = 36;

const FADE_START_FRACTION = 0.75;
const BASE_POSITION_Y = 1.75;
const BOB_FREQUENCY = 2;
const BOB_AMPLITUDE = 0.02;

// ── Types ──────────────────────────────────────────────────────────────

export interface SpeechBubbleOptions {
  thought: boolean;
}

interface BubbleShowOptions {
  thought: boolean;
  duration: number;
}

interface BubbleEntry {
  poolEntry: PoolEntry;
  age: number;
  duration: number;
  type: 'talk' | 'thought';
}

export interface BubbleState {
  opacity: number;
  positionY: number;
  texture: unknown;
  type: 'talk' | 'thought';
}

interface PoolInterface {
  acquire: () => PoolEntry;
  release: (entry: PoolEntry) => void;
}

export interface BubbleManager {
  show: (agentId: string, text: string, options: BubbleShowOptions) => void;
  hide: (agentId: string) => void;
  tick: (deltaSeconds: number) => Map<string, BubbleState>;
  dispose: () => void;
}

// ── Text truncation ────────────────────────────────────────────────────

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH - 3) + '...';
}

// ── Drawing: talk pointer ──────────────────────────────────────────────

function drawTalkPointer(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(BUBBLE_CANVAS_WIDTH / 2 - 8, BUBBLE_BODY_HEIGHT + BUBBLE_PADDING_Y);
  ctx.lineTo(BUBBLE_CANVAS_WIDTH / 2, BUBBLE_BODY_HEIGHT + BUBBLE_PADDING_Y + 14);
  ctx.lineTo(BUBBLE_CANVAS_WIDTH / 2 + 8, BUBBLE_BODY_HEIGHT + BUBBLE_PADDING_Y);
}

// ── Drawing: thought dots ──────────────────────────────────────────────

function drawThoughtDots(ctx: CanvasRenderingContext2D): void {
  const baseX = BUBBLE_CANVAS_WIDTH / 2;
  const baseY = BUBBLE_BODY_HEIGHT + BUBBLE_PADDING_Y + 4;

  ctx.beginPath();
  ctx.ellipse(baseX - 6, baseY + 4, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(baseX + 2, baseY + 10, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Drawing: bubble body ───────────────────────────────────────────────

function drawBubbleBody(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.roundRect(
    BUBBLE_PADDING_X,
    BUBBLE_PADDING_Y,
    BUBBLE_CANVAS_WIDTH - BUBBLE_PADDING_X * 2,
    BUBBLE_BODY_HEIGHT,
    BUBBLE_RADIUS,
  );
}

// ── Main draw function ─────────────────────────────────────────────────

export function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: SpeechBubbleOptions,
): void {
  const displayText = truncateText(text);

  // Clear canvas
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, BUBBLE_CANVAS_WIDTH, BUBBLE_CANVAS_HEIGHT);

  // Draw body background
  ctx.fillStyle = BUBBLE_BG_COLOR;
  ctx.strokeStyle = BUBBLE_BORDER_COLOR;
  ctx.lineWidth = 1.5;

  drawBubbleBody(ctx);

  if (!options.thought) {
    drawTalkPointer(ctx);
  }

  ctx.fill();
  ctx.stroke();

  // Draw thought dots (after body fill/stroke)
  if (options.thought) {
    ctx.fillStyle = BUBBLE_BG_COLOR;
    drawThoughtDots(ctx);
  }

  // Draw text
  ctx.fillStyle = BUBBLE_TEXT_COLOR;
  ctx.font = BUBBLE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, TEXT_CENTER_X, TEXT_CENTER_Y);
}

// ── Opacity calculation ────────────────────────────────────────────────

function computeOpacity(age: number, duration: number): number {
  const fraction = age / duration;
  if (fraction <= FADE_START_FRACTION) return 1;
  const fadeProg = (fraction - FADE_START_FRACTION) / (1 - FADE_START_FRACTION);
  return Math.max(0, 1 - fadeProg);
}

// ── Bob position ───────────────────────────────────────────────────────

function computePositionY(age: number): number {
  return BASE_POSITION_Y + Math.sin(age * BOB_FREQUENCY) * BOB_AMPLITUDE;
}

// ── Bubble manager factory ─────────────────────────────────────────────

export function createBubbleManager(pool: PoolInterface): BubbleManager {
  const bubbles = new Map<string, BubbleEntry>();

  function releaseBubble(agentId: string): void {
    const entry = bubbles.get(agentId);
    if (!entry) return;
    pool.release(entry.poolEntry);
    bubbles.delete(agentId);
  }

  function show(agentId: string, text: string, options: BubbleShowOptions): void {
    // Release existing bubble for this agent
    if (bubbles.has(agentId)) {
      releaseBubble(agentId);
    }

    const poolEntry = pool.acquire();
    const ctx = poolEntry.canvas.getContext('2d');
    if (ctx) {
      drawSpeechBubble(ctx, text, { thought: options.thought });
      poolEntry.texture.needsUpdate = true;
    }

    bubbles.set(agentId, {
      poolEntry,
      age: 0,
      duration: options.duration,
      type: options.thought ? 'thought' : 'talk',
    });
  }

  function hide(agentId: string): void {
    releaseBubble(agentId);
  }

  function tick(deltaSeconds: number): Map<string, BubbleState> {
    const result = new Map<string, BubbleState>();
    const expired: string[] = [];

    for (const [agentId, entry] of bubbles) {
      entry.age += deltaSeconds;

      if (entry.age >= entry.duration) {
        expired.push(agentId);
        continue;
      }

      result.set(agentId, {
        opacity: computeOpacity(entry.age, entry.duration),
        positionY: computePositionY(entry.age),
        texture: entry.poolEntry.texture,
        type: entry.type,
      });
    }

    for (const agentId of expired) {
      releaseBubble(agentId);
    }

    return result;
  }

  function dispose(): void {
    for (const agentId of Array.from(bubbles.keys())) {
      releaseBubble(agentId);
    }
  }

  return { show, hide, tick, dispose };
}
