'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MONITOR_CANVAS, CODE_PALETTES } from '@/lib/furniture-geometry';
import type { AgentActivity } from '@/types/agent';

interface MonitorScreenProps {
  activity?: AgentActivity;
  width?: number;
  height?: number;
}

/**
 * Draw one frame of scrolling code animation onto a 2D canvas context.
 * Exported for unit testing.
 */
export function drawScrollingCode(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  activity: AgentActivity,
): void {
  const scrollSpeed = 2;

  // Scroll existing content up
  const imgData = ctx.getImageData(0, scrollSpeed, canvasWidth, canvasHeight - scrollSpeed);
  ctx.putImageData(imgData, 0, 0);

  // Clear bottom rows
  ctx.fillStyle = MONITOR_CANVAS.backgroundColor;
  ctx.fillRect(0, canvasHeight - scrollSpeed, canvasWidth, scrollSpeed);

  if (activity === 'idle') return;

  const palette = CODE_PALETTES[activity] ?? CODE_PALETTES.typing;

  // Draw 1-2 code lines per frame
  const lineCount = 1 + Math.floor(Math.random() * 2);
  for (let line = 0; line < lineCount; line++) {
    const y = canvasHeight - scrollSpeed + line;
    if (y >= canvasHeight) break;

    if (Math.random() < 0.8) {
      const indent = Math.floor(Math.random() * 4) * 10;
      const lineLen = 15 + Math.floor(Math.random() * 55);
      ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
      ctx.fillRect(indent, y, lineLen, 2);

      // Secondary token
      if (Math.random() < 0.5) {
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
        ctx.fillRect(indent + lineLen + 5, y, 12 + Math.floor(Math.random() * 30), 2);
      }

      // Cursor blink
      if (Math.random() < 0.15) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(indent + lineLen + 2, y, 3, 2);
      }
    }
  }
}

export default function MonitorScreen({
  activity = 'idle',
  width = MONITOR_CANVAS.width,
  height = MONITOR_CANVAS.height,
}: MonitorScreenProps) {
  const { invalidate } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const context = c.getContext('2d')!;
    context.fillStyle = MONITOR_CANVAS.backgroundColor;
    context.fillRect(0, 0, width, height);
    const tex = new THREE.CanvasTexture(c);
    return { canvas: c, ctx: context, texture: tex };
  }, [width, height]);

  useFrame(() => {
    if (activity !== 'idle') {
      drawScrollingCode(ctx, canvas.width, canvas.height, activity);
      texture.needsUpdate = true;
      invalidate();
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        emissive={activity !== 'idle' ? '#002211' : '#001108'}
        emissiveIntensity={activity !== 'idle' ? 0.15 : 0.05}
      />
    </mesh>
  );
}
