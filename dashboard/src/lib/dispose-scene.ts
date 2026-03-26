/**
 * Texture map property names to check on materials for disposal.
 * Covers all standard Three.js MeshStandardMaterial / MeshPhongMaterial maps.
 */
const TEXTURE_MAP_KEYS = [
  'map',
  'normalMap',
  'bumpMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'displacementMap',
  'alphaMap',
  'envMap',
  'lightMap',
  'specularMap',
] as const;

interface Disposable {
  dispose: () => void;
}

interface DisposalResult {
  disposed: number;
}

function isDisposable(obj: unknown): obj is Disposable {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Disposable).dispose === 'function'
  );
}

/**
 * Recursively dispose all Three.js resources (geometries, materials, textures)
 * within an object graph. Returns count of disposed resources for verification.
 *
 * Fulfils REQ-053: proper disposal on component unmount to prevent WebGL memory leaks.
 */
export function disposeScene(object: {
  traverse: (fn: (child: any) => void) => void;
}): DisposalResult {
  let disposed = 0;

  object.traverse((child: any) => {
    // Dispose geometry
    if (child.geometry && isDisposable(child.geometry)) {
      child.geometry.dispose();
      disposed++;
    }

    // Dispose material(s)
    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        // Dispose textures from material
        for (const key of TEXTURE_MAP_KEYS) {
          const texture = (material as Record<string, unknown>)[key];
          if (isDisposable(texture)) {
            texture.dispose();
            disposed++;
          }
        }

        // Dispose the material itself
        if (isDisposable(material)) {
          material.dispose();
          disposed++;
        }
      }
    }
  });

  return { disposed };
}
