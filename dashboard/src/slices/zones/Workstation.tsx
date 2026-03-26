'use client';

import MonitorScreen from './MonitorScreen';
import { DESK, MONITOR, LAMP, CHAIR, STATUS_COLORS } from '@/lib/furniture-geometry';
import type { AgentStatus } from '@/types/agent';
import type { AgentActivity } from '@/types/agent';

interface WorkstationProps {
  position: [number, number, number];
  rotation?: number;
  status?: AgentStatus;
  activity?: AgentActivity;
}

/** Chair mesh group positioned behind the desk. */
function Chair() {
  const seatY = CHAIR.seatHeight;
  const backY = seatY + CHAIR.seatThickness / 2 + CHAIR.backHeight / 2;
  const armY = seatY + CHAIR.armHeight / 2;
  const armX = CHAIR.seatWidth / 2 - CHAIR.armWidth / 2;

  return (
    <group position={[0, 0, CHAIR.offsetZ]}>
      {/* Pneumatic cylinder */}
      <mesh position={[0, CHAIR.cylinderHeight / 2, 0]}>
        <cylinderGeometry args={[CHAIR.cylinderRadius, CHAIR.cylinderRadius, CHAIR.cylinderHeight, 8]} />
        <meshStandardMaterial color={CHAIR.baseColor} metalness={0.7} />
      </mesh>

      {/* 5-star base spokes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const cx = Math.sin(angle) * CHAIR.baseRadius * 0.5;
        const cz = Math.cos(angle) * CHAIR.baseRadius * 0.5;
        return (
          <mesh key={`spoke-${i}`} position={[cx, 0.02, cz]} rotation={[0, -angle, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, CHAIR.baseRadius, 6]} />
            <meshStandardMaterial color={CHAIR.baseColor} metalness={0.6} />
          </mesh>
        );
      })}

      {/* Seat */}
      <mesh position={[0, seatY, 0]} castShadow>
        <boxGeometry args={[CHAIR.seatWidth, CHAIR.seatThickness, CHAIR.seatDepth]} />
        <meshStandardMaterial color={CHAIR.seatColor} />
      </mesh>

      {/* Back */}
      <mesh position={[0, backY, -CHAIR.seatDepth / 2 + CHAIR.backThickness / 2]} castShadow>
        <boxGeometry args={[CHAIR.seatWidth, CHAIR.backHeight, CHAIR.backThickness]} />
        <meshStandardMaterial color={CHAIR.seatColor} />
      </mesh>

      {/* Left armrest */}
      <mesh position={[-armX, armY, 0]}>
        <boxGeometry args={[CHAIR.armWidth, CHAIR.armThickness, CHAIR.armDepth]} />
        <meshStandardMaterial color={CHAIR.armColor} />
      </mesh>

      {/* Right armrest */}
      <mesh position={[armX, armY, 0]}>
        <boxGeometry args={[CHAIR.armWidth, CHAIR.armThickness, CHAIR.armDepth]} />
        <meshStandardMaterial color={CHAIR.armColor} />
      </mesh>
    </group>
  );
}

/**
 * Desk + monitor + lamp + chair group.
 * REQ-022, REQ-029, REQ-030, REQ-031
 */
export default function Workstation({
  position,
  rotation = 0,
  status = 'idle',
  activity = 'idle',
}: WorkstationProps) {
  const lampColor = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
  const lampIntensity = status === 'active' ? 2.0 : status === 'error' ? 1.5 : 0.8;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk surface */}
      <mesh position={[0, DESK.surfaceY, 0]} castShadow receiveShadow>
        <boxGeometry args={[DESK.width, DESK.height, DESK.depth]} />
        <meshStandardMaterial color={DESK.color} />
      </mesh>

      {/* Desk legs */}
      {[
        [-DESK.width / 2 + 0.04, DESK.legHeight / 2, -DESK.depth / 2 + 0.04],
        [DESK.width / 2 - 0.04, DESK.legHeight / 2, -DESK.depth / 2 + 0.04],
        [-DESK.width / 2 + 0.04, DESK.legHeight / 2, DESK.depth / 2 - 0.04],
        [DESK.width / 2 - 0.04, DESK.legHeight / 2, DESK.depth / 2 - 0.04],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[DESK.legRadius, DESK.legRadius, DESK.legHeight, 8]} />
          <meshStandardMaterial color={DESK.legColor} metalness={0.6} />
        </mesh>
      ))}

      {/* Monitor casing */}
      <mesh position={[0, MONITOR.centerY, MONITOR.centerZ]} castShadow>
        <boxGeometry args={[MONITOR.width, MONITOR.height, MONITOR.depth]} />
        <meshStandardMaterial color={MONITOR.casingColor} />
      </mesh>

      {/* Monitor screen (canvas texture) */}
      <group
        position={[
          0,
          MONITOR.centerY,
          MONITOR.centerZ + MONITOR.depth / 2 + 0.002,
        ]}
        scale={[
          MONITOR.width - MONITOR.screenInset,
          MONITOR.height - MONITOR.screenInset,
          1,
        ]}
      >
        <MonitorScreen activity={activity} />
      </group>

      {/* Monitor stand */}
      <mesh
        position={[0, MONITOR.centerY - MONITOR.height / 2 - MONITOR.standHeight / 2, MONITOR.centerZ - MONITOR.depth / 2]}
        castShadow
      >
        <cylinderGeometry args={[MONITOR.standRadius, MONITOR.standRadius, MONITOR.standHeight, 8]} />
        <meshStandardMaterial color={MONITOR.standColor} />
      </mesh>

      {/* Monitor base */}
      <mesh
        position={[0, DESK.surfaceY + 0.02, MONITOR.centerZ - MONITOR.depth / 2]}
      >
        <boxGeometry args={[MONITOR.baseWidth, 0.01, MONITOR.baseDepth]} />
        <meshStandardMaterial color={MONITOR.standColor} />
      </mesh>

      {/* Desk lamp - base */}
      <mesh position={[LAMP.positionX, LAMP.positionY + LAMP.baseHeight / 2, LAMP.positionZ]}>
        <cylinderGeometry args={[LAMP.baseRadius, LAMP.baseRadius, LAMP.baseHeight, 12]} />
        <meshStandardMaterial color={LAMP.baseColor} />
      </mesh>

      {/* Desk lamp - pole */}
      <mesh position={[LAMP.positionX, LAMP.positionY + LAMP.baseHeight + LAMP.poleHeight / 2, LAMP.positionZ]}>
        <cylinderGeometry args={[LAMP.poleRadius, LAMP.poleRadius, LAMP.poleHeight, 8]} />
        <meshStandardMaterial color={LAMP.poleColor} />
      </mesh>

      {/* Desk lamp - shade (status colored) */}
      <mesh
        position={[
          LAMP.positionX,
          LAMP.positionY + LAMP.baseHeight + LAMP.poleHeight + LAMP.shadeHeight / 2,
          LAMP.positionZ,
        ]}
      >
        <cylinderGeometry
          args={[LAMP.shadeRadiusTop, LAMP.shadeRadiusBottom, LAMP.shadeHeight, 12]}
        />
        <meshStandardMaterial
          color={lampColor}
          emissive={lampColor}
          emissiveIntensity={lampIntensity}
        />
      </mesh>

      {/* Office chair */}
      <Chair />
    </group>
  );
}
