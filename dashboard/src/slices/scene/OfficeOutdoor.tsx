'use client';

import {
  PARKING_LOT,
  CAR_POSITIONS,
  FLOWER_BED_POSITIONS,
  OUTDOOR_BENCH_POSITIONS,
  LAMP_POST_POSITIONS,
  BOLLARD_POSITIONS,
  WALKWAY,
} from '@/lib/outdoor-layout';
import type {
  CarPosition,
  FlowerBedPosition,
  OutdoorBenchPosition,
  LampPostPosition,
  BollardPosition,
} from '@/lib/outdoor-layout';

// ─── Outdoor Geometry Constants ─────────────────────────────

const CAR = {
  bodyWidth: 2.0,
  bodyHeight: 0.6,
  bodyDepth: 4.0,
  roofWidth: 1.6,
  roofHeight: 0.5,
  roofDepth: 2.0,
  wheelRadius: 0.25,
  wheelWidth: 0.15,
  windshieldWidth: 1.5,
  windshieldHeight: 0.45,
  windshieldDepth: 0.05,
} as const;

const BENCH = {
  seatWidth: 1.5,
  seatHeight: 0.05,
  seatDepth: 0.4,
  seatY: 0.45,
  legWidth: 0.06,
  legHeight: 0.43,
  backHeight: 0.5,
  backDepth: 0.04,
  color: '#8B6914',
  legColor: '#444444',
} as const;

const LAMP = {
  poleRadius: 0.06,
  poleHeight: 3.5,
  bulbRadius: 0.15,
  poleColor: '#555555',
  bulbColor: '#ffffcc',
} as const;

const BOLLARD_DIM = {
  radius: 0.1,
  height: 0.6,
  color: '#888888',
} as const;

// ─── Sub-components ─────────────────────────────────────────

/** Renders a single procedural car from box geometry. */
function Car({ car }: { car: CarPosition }) {
  const y = CAR.wheelRadius + CAR.bodyHeight / 2;
  return (
    <group position={[car.x, 0, car.z]} rotation={[0, car.rotation, 0]}>
      {/* Body */}
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[CAR.bodyWidth, CAR.bodyHeight, CAR.bodyDepth]} />
        <meshStandardMaterial color={car.color} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, y + CAR.bodyHeight / 2 + CAR.roofHeight / 2, -0.3]} castShadow>
        <boxGeometry args={[CAR.roofWidth, CAR.roofHeight, CAR.roofDepth]} />
        <meshStandardMaterial color={car.color} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, y + CAR.bodyHeight / 2 + 0.15, 0.8]}>
        <boxGeometry args={[CAR.windshieldWidth, CAR.windshieldHeight, CAR.windshieldDepth]} />
        <meshPhysicalMaterial color="#aaddff" transparent opacity={0.4} />
      </mesh>
      {/* Wheels (4) */}
      {[[-0.85, -1.2], [-0.85, 1.2], [0.85, -1.2], [0.85, 1.2]].map(([wx, wz], i) => (
        <mesh key={i} position={[wx, CAR.wheelRadius, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[CAR.wheelRadius, CAR.wheelRadius, CAR.wheelWidth, 8]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
}

/** Renders a flower bed with soil box and small flower spheres. */
function FlowerBed({ bed }: { bed: FlowerBedPosition }) {
  return (
    <group position={[bed.x, 0, bed.z]}>
      {/* Soil */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <boxGeometry args={[bed.width, 0.2, bed.depth]} />
        <meshStandardMaterial color="#3d2b1f" />
      </mesh>
      {/* Flowers (5 small spheres) */}
      {[-0.8, -0.4, 0, 0.4, 0.8].map((fx, i) => (
        <mesh key={i} position={[fx, 0.3, 0]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color={bed.flowerColor} />
        </mesh>
      ))}
      {/* Foliage */}
      {[-0.6, -0.2, 0.2, 0.6].map((fx, i) => (
        <mesh key={`leaf-${i}`} position={[fx, 0.22, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial color="#2d6a1e" />
        </mesh>
      ))}
    </group>
  );
}

/** Renders an outdoor bench with seat, back, and legs. */
function OutdoorBench({ bench }: { bench: OutdoorBenchPosition }) {
  return (
    <group position={[bench.x, 0, bench.z]} rotation={[0, bench.rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, BENCH.seatY, 0]}>
        <boxGeometry args={[BENCH.seatWidth, BENCH.seatHeight, BENCH.seatDepth]} />
        <meshStandardMaterial color={BENCH.color} />
      </mesh>
      {/* Back rest */}
      <mesh position={[0, BENCH.seatY + BENCH.backHeight / 2, -BENCH.seatDepth / 2]}>
        <boxGeometry args={[BENCH.seatWidth, BENCH.backHeight, BENCH.backDepth]} />
        <meshStandardMaterial color={BENCH.color} />
      </mesh>
      {/* Legs (4) */}
      {[[-0.6, -0.15], [-0.6, 0.15], [0.6, -0.15], [0.6, 0.15]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, BENCH.legHeight / 2, lz]}>
          <boxGeometry args={[BENCH.legWidth, BENCH.legHeight, BENCH.legWidth]} />
          <meshStandardMaterial color={BENCH.legColor} />
        </mesh>
      ))}
    </group>
  );
}

/** Renders a lamp post with pole and glowing bulb sphere. */
function LampPost({ lamp }: { lamp: LampPostPosition }) {
  return (
    <group position={[lamp.x, 0, lamp.z]}>
      {/* Pole */}
      <mesh position={[0, LAMP.poleHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[LAMP.poleRadius, LAMP.poleRadius, LAMP.poleHeight, 8]} />
        <meshStandardMaterial color={LAMP.poleColor} />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, LAMP.poleHeight + LAMP.bulbRadius, 0]}>
        <sphereGeometry args={[LAMP.bulbRadius, 8, 8]} />
        <meshStandardMaterial
          color={LAMP.bulbColor}
          emissive={LAMP.bulbColor}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

/** Renders a short bollard cylinder. */
function Bollard({ pos }: { pos: BollardPosition }) {
  return (
    <mesh position={[pos.x, BOLLARD_DIM.height / 2, pos.z]}>
      <cylinderGeometry args={[BOLLARD_DIM.radius, BOLLARD_DIM.radius, BOLLARD_DIM.height, 8]} />
      <meshStandardMaterial color={BOLLARD_DIM.color} />
    </mesh>
  );
}

/** Renders the parking lot surface with line markings. */
function ParkingLotSurface() {
  const { centerX, centerZ, width, depth, lineCount, lineSpacing } = PARKING_LOT;
  const startZ = centerZ - ((lineCount - 1) * lineSpacing) / 2;

  return (
    <group>
      {/* Asphalt */}
      <mesh position={[centerX, 0.001, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={PARKING_LOT.surfaceColor} />
      </mesh>
      {/* Line markings */}
      {Array.from({ length: lineCount }, (_, i) => (
        <mesh
          key={i}
          position={[centerX, 0.005, startZ + i * lineSpacing]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width - 1, 0.08]} />
          <meshStandardMaterial color={PARKING_LOT.lineColor} />
        </mesh>
      ))}
    </group>
  );
}

/** Renders the walkway connecting the south door to the parking area. */
function WalkwaySurface() {
  return (
    <mesh
      position={[WALKWAY.centerX, 0.002, WALKWAY.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[WALKWAY.width, WALKWAY.depth]} />
      <meshStandardMaterial color={WALKWAY.color} />
    </mesh>
  );
}

/** Full outdoor environment: parking lot, cars, flower beds, benches, lamp posts, bollards, walkway. */
export default function OfficeOutdoor() {
  return (
    <group>
      <ParkingLotSurface />
      <WalkwaySurface />

      {CAR_POSITIONS.map((car, i) => (
        <Car key={`car-${i}`} car={car} />
      ))}

      {FLOWER_BED_POSITIONS.map((bed, i) => (
        <FlowerBed key={`bed-${i}`} bed={bed} />
      ))}

      {OUTDOOR_BENCH_POSITIONS.map((bench, i) => (
        <OutdoorBench key={`bench-${i}`} bench={bench} />
      ))}

      {LAMP_POST_POSITIONS.map((lamp, i) => (
        <LampPost key={`lamp-${i}`} lamp={lamp} />
      ))}

      {BOLLARD_POSITIONS.map((pos, i) => (
        <Bollard key={`bollard-${i}`} pos={pos} />
      ))}
    </group>
  );
}
