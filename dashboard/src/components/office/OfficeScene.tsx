'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function OfficeScene() {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [10, 10, 10], fov: 50 }}
    >
      <ambientLight intensity={0.4} />
      <hemisphereLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <OrbitControls />
    </Canvas>
  );
}
