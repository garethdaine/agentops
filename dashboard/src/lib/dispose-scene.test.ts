import { describe, it, expect, vi } from 'vitest';
import { disposeScene } from './dispose-scene';

/** Minimal mock helpers to simulate Three.js objects without importing Three.js */
function mockTexture() {
  return { dispose: vi.fn() };
}

function mockMaterial(textures: Record<string, ReturnType<typeof mockTexture>> = {}) {
  return {
    dispose: vi.fn(),
    ...textures,
  };
}

function mockGeometry() {
  return { dispose: vi.fn() };
}

interface MockMeshOptions {
  geometry?: ReturnType<typeof mockGeometry>;
  material?: ReturnType<typeof mockMaterial> | ReturnType<typeof mockMaterial>[];
}

function mockObject3D(
  children: any[] = [],
  meshOptions?: MockMeshOptions,
): any {
  const obj: any = {
    children: [...children],
    traverse: function (fn: (child: any) => void) {
      fn(this);
      for (const child of this.children) {
        if (child.traverse) {
          child.traverse(fn);
        } else {
          fn(child);
        }
      }
    },
  };
  if (meshOptions?.geometry) {
    obj.geometry = meshOptions.geometry;
  }
  if (meshOptions?.material) {
    obj.material = meshOptions.material;
  }
  return obj;
}

describe('disposeScene', () => {
  it('should traverse all children', () => {
    const child1 = mockObject3D();
    const child2 = mockObject3D();
    const grandchild = mockObject3D();
    child1.children.push(grandchild);

    const root = mockObject3D([child1, child2]);

    // Should not throw
    const result = disposeScene(root);
    expect(result).toBeDefined();
    expect(typeof result.disposed).toBe('number');
  });

  it('should dispose geometries', () => {
    const geo = mockGeometry();
    const mesh = mockObject3D([], { geometry: geo });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    expect(geo.dispose).toHaveBeenCalledTimes(1);
    expect(result.disposed).toBeGreaterThanOrEqual(1);
  });

  it('should dispose single materials', () => {
    const mat = mockMaterial();
    const mesh = mockObject3D([], { material: mat });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    expect(mat.dispose).toHaveBeenCalledTimes(1);
    expect(result.disposed).toBeGreaterThanOrEqual(1);
  });

  it('should dispose material arrays', () => {
    const mat1 = mockMaterial();
    const mat2 = mockMaterial();
    const mesh = mockObject3D([], { material: [mat1, mat2] });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    expect(mat1.dispose).toHaveBeenCalledTimes(1);
    expect(mat2.dispose).toHaveBeenCalledTimes(1);
    expect(result.disposed).toBeGreaterThanOrEqual(2);
  });

  it('should dispose textures from materials', () => {
    const diffuseMap = mockTexture();
    const normalMap = mockTexture();
    const mat = mockMaterial({ map: diffuseMap, normalMap });
    const mesh = mockObject3D([], { material: mat });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    expect(diffuseMap.dispose).toHaveBeenCalledTimes(1);
    expect(normalMap.dispose).toHaveBeenCalledTimes(1);
    expect(result.disposed).toBeGreaterThanOrEqual(3); // 1 material + 2 textures
  });

  it('should handle all standard texture map types', () => {
    const maps: Record<string, ReturnType<typeof mockTexture>> = {};
    const mapNames = [
      'map', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap',
      'aoMap', 'emissiveMap', 'displacementMap', 'alphaMap', 'envMap',
      'lightMap', 'specularMap',
    ];
    for (const name of mapNames) {
      maps[name] = mockTexture();
    }
    const mat = mockMaterial(maps);
    const mesh = mockObject3D([], { material: mat });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    for (const name of mapNames) {
      expect(maps[name].dispose).toHaveBeenCalledTimes(1);
    }
    // 1 material + 12 textures
    expect(result.disposed).toBeGreaterThanOrEqual(13);
  });

  it('should return count of disposed resources', () => {
    const geo = mockGeometry();
    const tex = mockTexture();
    const mat = mockMaterial({ map: tex });
    const mesh = mockObject3D([], { geometry: geo, material: mat });
    const root = mockObject3D([mesh]);

    const result = disposeScene(root);
    // At least: 1 geometry + 1 material + 1 texture = 3
    expect(result.disposed).toBeGreaterThanOrEqual(3);
  });

  it('should handle objects with no geometry or material', () => {
    const root = mockObject3D([mockObject3D(), mockObject3D()]);
    const result = disposeScene(root);
    expect(result.disposed).toBe(0);
  });
});
