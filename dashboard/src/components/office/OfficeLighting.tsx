'use client';

/**
 * 3-light setup: ambient, hemisphere, and directional with soft shadows.
 * REQ-033
 */
export default function OfficeLighting() {
  return (
    <>
      {/* Ambient fill light */}
      <ambientLight intensity={0.3} />

      {/* Hemisphere light: sky blue from above, dark ground */}
      <hemisphereLight
        args={['#b1e1ff', '#1a1a2e', 0.5]}
      />

      {/* Directional sunlight with soft shadows */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
    </>
  );
}
