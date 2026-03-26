import { CanvasTexture, SRGBColorSpace, LinearFilter } from 'three';

export interface PoolEntry {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

interface PoolConfig {
  width: number;
  height: number;
  maxSize: number;
}

interface TexturePool {
  acquire: () => PoolEntry;
  release: (entry: PoolEntry) => void;
  dispose: () => void;
  readonly activeCount: number;
  readonly freeCount: number;
}

function createEntry(width: number, height: number): PoolEntry {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;

  return { canvas, texture };
}

export function createTexturePool(config: PoolConfig): TexturePool {
  const { width, height, maxSize } = config;
  const free: PoolEntry[] = [];
  const active = new Set<PoolEntry>();

  function acquire(): PoolEntry {
    const entry = free.pop() ?? createEntry(width, height);
    active.add(entry);
    return entry;
  }

  function release(entry: PoolEntry): void {
    active.delete(entry);

    if (free.length < maxSize) {
      free.push(entry);
    } else {
      entry.texture.dispose();
    }
  }

  function dispose(): void {
    for (const entry of free) {
      entry.texture.dispose();
    }
    free.length = 0;
    active.clear();
  }

  return {
    acquire,
    release,
    dispose,
    get activeCount() {
      return active.size;
    },
    get freeCount() {
      return free.length;
    },
  };
}

export function createMonitorPool(): TexturePool {
  return createTexturePool({ width: 128, height: 96, maxSize: 8 });
}

export function createSpeechBubblePool(): TexturePool {
  return createTexturePool({ width: 320, height: 96, maxSize: 4 });
}
