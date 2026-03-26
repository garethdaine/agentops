'use client';

/**
 * 3-light setup: ambient, hemisphere, and directional with soft shadows.
 * REQ-033
 */
export default function OfficeLighting() {
  return (
    <>
      {/* Ambient fill light — bright enough to see everything */}
      <ambientLight intensity={0.6} />

      {/* Hemisphere light: warm sky, cool ground */}
      <hemisphereLight
        args={['#e8d5b7', '#4a6fa5', 0.8]}
      />

      {/* Main directional sunlight with soft shadows */}
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.001}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-8, 8, -6]}
        intensity={0.4}
        color="#6699cc"
      />
    </>
  );
}
