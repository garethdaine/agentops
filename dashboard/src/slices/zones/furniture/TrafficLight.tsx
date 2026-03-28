'use client';

import { TRAFFIC_LIGHT } from '@/lib/furniture-geometry';
import type { TrafficColor } from '../zone-feedback';

interface TrafficLightProps {
  position: [number, number, number];
  rotation?: number;
  /** Active light derived from system load. */
  activeColor?: TrafficColor;
}

/** Traffic light indicator: red (rate limited), amber (high load), green (healthy). */
export default function TrafficLight({ position, rotation = 0, activeColor = 'green' }: TrafficLightProps) {
  const lights = [
    { y: 0.38, color: TRAFFIC_LIGHT.redColor, id: 'red' as const },
    { y: 0.25, color: TRAFFIC_LIGHT.amberColor, id: 'amber' as const },
    { y: 0.12, color: TRAFFIC_LIGHT.greenColor, id: 'green' as const },
  ];

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Housing */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[TRAFFIC_LIGHT.width, TRAFFIC_LIGHT.height, TRAFFIC_LIGHT.depth]} />
        <meshStandardMaterial color={TRAFFIC_LIGHT.color} />
      </mesh>

      {/* Light spheres */}
      {lights.map(({ y, color, id }) => (
        <mesh key={y} position={[0, y, -TRAFFIC_LIGHT.depth / 2]}>
          <sphereGeometry args={[TRAFFIC_LIGHT.lightRadius, 12, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={id === activeColor ? 0.8 : 0.05}
          />
        </mesh>
      ))}
    </group>
  );
}
