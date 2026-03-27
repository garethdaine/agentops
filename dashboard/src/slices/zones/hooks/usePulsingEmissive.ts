'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { MeshStandardMaterial } from 'three';

interface PulsingEmissiveOptions {
  /** Base emissive color as hex string. */
  color: string;
  /** Animation mode: 'pulse' for smooth sin wave, 'blink' for on/off, 'static' for no animation. */
  mode: 'pulse' | 'blink' | 'static';
  /** Peak intensity value (0-1 range). */
  intensity: number;
  /** Oscillation frequency in Hz. Default 1.5. */
  frequency?: number;
}

/**
 * Shared hook for sin-based LED pulsing on emissive materials.
 * Returns a ref to attach to a meshStandardMaterial.
 * Updates emissiveIntensity each frame based on mode.
 */
export function usePulsingEmissive(options: PulsingEmissiveOptions) {
  const { mode, intensity, frequency = 1.5 } = options;
  const matRef = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.elapsedTime;

    switch (mode) {
      case 'pulse': {
        const factor = (Math.sin(t * frequency * Math.PI * 2) + 1) / 2;
        matRef.current.emissiveIntensity = factor * intensity;
        break;
      }
      case 'blink': {
        const on = Math.sin(t * frequency * Math.PI * 2) > 0;
        matRef.current.emissiveIntensity = on ? intensity : 0;
        break;
      }
      case 'static': {
        matRef.current.emissiveIntensity = intensity;
        break;
      }
    }
  });

  return matRef;
}
