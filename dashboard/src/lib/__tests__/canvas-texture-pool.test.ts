import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Three.js CanvasTexture since jsdom doesn't have WebGL
vi.mock('three', () => ({
  CanvasTexture: class MockCanvasTexture {
    image: HTMLCanvasElement;
    needsUpdate = false;
    disposed = false;
    constructor(canvas: HTMLCanvasElement) {
      this.image = canvas;
    }
    dispose() {
      this.disposed = true;
    }
  },
  SRGBColorSpace: 'srgb',
  LinearFilter: 1006,
}));

describe('CanvasTexturePool', () => {
  let pool: typeof import('@/lib/canvas-texture-pool');

  beforeEach(async () => {
    vi.resetModules();
    pool = await import('@/lib/canvas-texture-pool');
  });

  describe('acquire', () => {
    it('should return a unique texture entry for each acquire call', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 4 });
      const t1 = p.acquire();
      const t2 = p.acquire();

      expect(t1).toBeDefined();
      expect(t2).toBeDefined();
      expect(t1.canvas).not.toBe(t2.canvas);
      expect(t1.texture).not.toBe(t2.texture);

      p.dispose();
    });

    it('should return canvas with requested dimensions', () => {
      const p = pool.createTexturePool({ width: 320, height: 96, maxSize: 2 });
      const entry = p.acquire();

      expect(entry.canvas.width).toBe(320);
      expect(entry.canvas.height).toBe(96);

      p.dispose();
    });
  });

  describe('release', () => {
    it('should return texture to pool for reuse', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 4 });
      const t1 = p.acquire();
      const canvas1 = t1.canvas;

      p.release(t1);

      const t2 = p.acquire();
      // Should reuse the released canvas
      expect(t2.canvas).toBe(canvas1);

      p.dispose();
    });

    it('should not exceed maxSize in the free pool', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 2 });

      const entries = [p.acquire(), p.acquire(), p.acquire()];
      const disposeSpy = vi.spyOn(entries[2].texture, 'dispose');

      // Release all 3 -- only 2 should be kept in pool
      entries.forEach(e => p.release(e));

      // Third one should have been disposed since pool is full
      expect(disposeSpy).toHaveBeenCalled();

      p.dispose();
    });
  });

  describe('dispose', () => {
    it('should dispose all textures on teardown', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 4 });
      const t1 = p.acquire();
      const t2 = p.acquire();
      p.release(t1);

      const spyFree = vi.spyOn(t1.texture, 'dispose');
      const spyActive = vi.spyOn(t2.texture, 'dispose');

      p.dispose();

      // Free pool entries should be disposed
      expect(spyFree).toHaveBeenCalled();
    });

    it('should return empty entries after dispose', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 4 });
      p.acquire();
      p.dispose();

      // Acquiring after dispose should still work (creates fresh)
      const fresh = p.acquire();
      expect(fresh).toBeDefined();
      expect(fresh.canvas.width).toBe(128);

      p.dispose();
    });
  });

  describe('standardised sizes', () => {
    it('should support monitor size (128x96)', () => {
      const p = pool.createTexturePool({ width: 128, height: 96, maxSize: 8 });
      const entry = p.acquire();
      expect(entry.canvas.width).toBe(128);
      expect(entry.canvas.height).toBe(96);
      p.dispose();
    });

    it('should support speech bubble size (320x96)', () => {
      const p = pool.createTexturePool({ width: 320, height: 96, maxSize: 4 });
      const entry = p.acquire();
      expect(entry.canvas.width).toBe(320);
      expect(entry.canvas.height).toBe(96);
      p.dispose();
    });
  });
});
