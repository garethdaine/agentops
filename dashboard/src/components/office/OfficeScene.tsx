'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import OfficeFloor from './OfficeFloor';
import OfficeWalls from './OfficeWalls';
import OfficeLighting from './OfficeLighting';
import Workstation from './Workstation';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';

/**
 * Root R3F scene component.
 * Renders the office floor, walls, lighting, and workstations.
 * Uses frameloop="demand" for on-demand rendering (REQ-034).
 */
export default function OfficeScene() {
  return (
    <Canvas
      frameloop="demand"
      shadows
      camera={{ position: [10, 10, 10], fov: 50 }}
      gl={{ antialias: true }}
    >
      <OfficeLighting />
      <OfficeFloor />
      <OfficeWalls />

      {WORKSTATION_SLOTS.map((slot, i) => (
        <Workstation
          key={i}
          position={slot.position}
          rotation={slot.rotation}
          status="idle"
          activity="idle"
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={30}
      />
    </Canvas>
  );
}
