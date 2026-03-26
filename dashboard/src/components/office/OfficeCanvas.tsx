'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { disposeScene } from '@/lib/dispose-scene';

const OfficeScene = dynamic(
  () => import('./OfficeScene'),
  { ssr: false }
);

export default function OfficeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      // Dispose Three.js resources on unmount (REQ-053)
      const canvas = containerRef.current?.querySelector('canvas');
      if (canvas) {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (gl && '__r3f' in canvas) {
          const r3fState = (canvas as any).__r3f;
          if (r3fState?.scene) {
            disposeScene(r3fState.scene);
          }
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <OfficeScene />
    </div>
  );
}
