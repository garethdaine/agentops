'use client';

import { Text } from '@react-three/drei';
import { ZONES } from '@/lib/floorplan';

/** Floating zone name labels positioned above each zone in 3D space. */
export default function ZoneLabels() {
  return (
    <group>
      {ZONES.map((zone) => (
        <Text
          key={zone.id}
          position={[zone.position.x, 3.5, zone.position.z]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.75}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {zone.name}
        </Text>
      ))}
    </group>
  );
}
