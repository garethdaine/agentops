'use client';

import {
  PLANT,
  TRASH_BIN,
  WATER_COOLER,
  PHOTOCOPIER,
  PRINTER_DIM,
  CLUTTER,
  DESK,
} from '@/lib/furniture-geometry';
import {
  PLANT_POSITIONS,
  EQUIPMENT_POSITIONS,
  computeClutterItems,
} from '@/lib/decoration-layout';
import { WORKSTATION_SLOTS } from '@/lib/floorplan';

/** Renders a single floor plant as a cylinder trunk + sphere canopy. */
function FloorPlant({ x, z, height }: { x: number; z: number; height: number }) {
  const trunkH = PLANT.trunkHeight * height;
  const canopyR = PLANT.canopyRadius * height;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[PLANT.trunkRadius, PLANT.trunkRadius, trunkH, 8]} />
        <meshStandardMaterial color={PLANT.trunkColor} />
      </mesh>
      <mesh position={[0, trunkH + canopyR * 0.8, 0]}>
        <sphereGeometry args={[canopyR, 12, 10]} />
        <meshStandardMaterial color={PLANT.canopyColor} />
      </mesh>
    </group>
  );
}

/** Renders a single equipment item as a colored box mesh. */
function Equipment({
  type,
  x,
  z,
  rotation,
}: {
  type: string;
  x: number;
  z: number;
  rotation: number;
}) {
  const dims = resolveEquipmentDimensions(type);

  return (
    <mesh position={[x, dims.height / 2, z]} rotation={[0, rotation, 0]}>
      <boxGeometry args={[dims.width, dims.height, dims.depth]} />
      <meshStandardMaterial color={dims.color} />
    </mesh>
  );
}

/** Resolves equipment type to its geometry dimensions. */
function resolveEquipmentDimensions(type: string) {
  switch (type) {
    case 'waterCooler':
      return WATER_COOLER;
    case 'photocopier':
      return PHOTOCOPIER;
    case 'printer':
      return PRINTER_DIM;
    case 'trashBin':
      return {
        width: TRASH_BIN.radiusTop * 2,
        height: TRASH_BIN.height,
        depth: TRASH_BIN.radiusTop * 2,
        color: TRASH_BIN.color,
      };
    default:
      return { width: 0.3, height: 0.5, depth: 0.3, color: '#888888' };
  }
}

/** Renders desk clutter items (keyboards, cups, papers) on desk surfaces. */
function DeskClutter() {
  const items = computeClutterItems(WORKSTATION_SLOTS.length);
  const clutterY = DESK.surfaceY + CLUTTER.surfaceOffset;

  return (
    <group>
      {items.map((item, i) => {
        const slot = WORKSTATION_SLOTS[item.deskIndex];
        const [sx, , sz] = slot.position;

        return renderClutterItem(item.type, sx, clutterY, sz, i);
      })}
    </group>
  );
}

/** Renders a single clutter item at the given position. */
function renderClutterItem(
  type: string,
  sx: number,
  y: number,
  sz: number,
  key: number,
) {
  const k = CLUTTER.keyboard;
  const c = CLUTTER.coffeeCup;
  const p = CLUTTER.paperStack;

  switch (type) {
    case 'keyboard':
      return (
        <mesh key={key} position={[sx, y + k.height / 2, sz + 0.1]}>
          <boxGeometry args={[k.width, k.height, k.depth]} />
          <meshStandardMaterial color={k.color} />
        </mesh>
      );
    case 'coffeeCup':
      return (
        <mesh key={key} position={[sx + 0.4, y + c.height / 2, sz + 0.15]}>
          <cylinderGeometry args={[c.radius, c.radius, c.height, 8]} />
          <meshStandardMaterial color={c.color} />
        </mesh>
      );
    case 'paperStack':
      return (
        <mesh key={key} position={[sx - 0.35, y + p.height / 2, sz - 0.1]}>
          <boxGeometry args={[p.width, p.height, p.depth]} />
          <meshStandardMaterial color={p.color} />
        </mesh>
      );
    default:
      return null;
  }
}

/** Renders all indoor decorations: floor plants, equipment, and desk clutter. */
export default function OfficeDecorations() {
  return (
    <group>
      {PLANT_POSITIONS.map((plant, i) => (
        <FloorPlant key={`plant-${i}`} x={plant.x} z={plant.z} height={plant.height} />
      ))}
      {EQUIPMENT_POSITIONS.map((eq, i) => (
        <Equipment
          key={`equip-${i}`}
          type={eq.type}
          x={eq.x}
          z={eq.z}
          rotation={eq.rotation}
        />
      ))}
      <DeskClutter />
    </group>
  );
}
